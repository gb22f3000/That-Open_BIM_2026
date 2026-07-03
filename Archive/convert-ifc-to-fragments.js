#!/usr/bin/env node

/**
 * IFC to Fragments Converter Script (ESM)
 *
 * Converts all IFC files in the 'IFC FILES' directory to Fragments and saves
 * them under 'models/<Station>/' with a per-station models-manifest.json.
 *
 * Usage:
 *   node convert-ifc-to-fragments.js --station Sahibabad
 *   node convert-ifc-to-fragments.js --station MyStation --ifcDir "IFC FILES"
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Import That Open Company libraries
import * as FRAGS from '@thatopen/fragments';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI args
const args = process.argv.slice(2);
const getArg = (name, short) => {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    if (short) {
        const sIdx = args.indexOf(`-${short}`);
        if (sIdx !== -1 && args[sIdx + 1]) return args[sIdx + 1];
    }
    return undefined;
};

const STATION = getArg('station', 's') || 'Sahibabad';
const PROVIDED_IFC_DIR = getArg('ifcDir');
const IFC_FILES_DIR = PROVIDED_IFC_DIR
    ? path.isAbsolute(PROVIDED_IFC_DIR)
        ? PROVIDED_IFC_DIR
        : path.join(__dirname, PROVIDED_IFC_DIR)
    : path.join(__dirname, 'IFC FILES');
const MODELS_BASE_DIR = path.join(__dirname, 'public', 'models');
const MODELS_DIR = path.join(MODELS_BASE_DIR, STATION);
const WEB_IFC_VERSION = '0.0.71';

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`📁 Created models directory for station: ${STATION}`);
}

/**
 * Convert a single IFC file to Fragment format
 */
async function convertIFCToFragment(ifcFilePath, outputPath) {
    try {
        console.log(`🔄 Converting: ${path.basename(ifcFilePath)}`);
        
        // Initialize the IFC importer
        const serializer = new FRAGS.IfcImporter();
        serializer.wasm = { 
            absolute: true, 
            path: path.join(__dirname, 'node_modules', 'web-ifc') + path.sep
        };

        // Read the IFC file
        const ifcBuffer = fs.readFileSync(ifcFilePath);
        const ifcBytes = new Uint8Array(ifcBuffer);

        console.log(`   📏 File size: ${(ifcBytes.length / (1024 * 1024)).toFixed(2)} MB`);

        // Convert IFC to Fragments
        const fragmentBytes = await serializer.process({
            bytes: ifcBytes,
            progressCallback: (progress, data) => {
                if (progress.percentage && progress.percentage % 10 === 0) {
                    console.log(`   ⚡ Progress: ${progress.percentage}%`);
                }
            }
        });

        // Save the Fragment file
        fs.writeFileSync(outputPath, Buffer.from(fragmentBytes));
        
        const fragmentSize = (fragmentBytes.byteLength / (1024 * 1024)).toFixed(2);
        const compressionRatio = ((1 - fragmentBytes.byteLength / ifcBytes.length) * 100).toFixed(1);
        
        console.log(`   ✅ Saved: ${path.basename(outputPath)}`);
        console.log(`   📦 Fragment size: ${fragmentSize} MB (${compressionRatio}% smaller)`);
        console.log('');

        return {
            success: true,
            originalSize: ifcBytes.length,
            fragmentSize: fragmentBytes.byteLength,
            compressionRatio: parseFloat(compressionRatio)
        };

    } catch (error) {
        console.error(`   ❌ Error converting ${path.basename(ifcFilePath)}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Main conversion function
 */
async function convertAllIFCFiles() {
    console.log('🚀 Starting IFC to Fragments conversion...\n');

    // Check if IFC FILES directory exists
    if (!fs.existsSync(IFC_FILES_DIR)) {
        console.error('❌ IFC FILES directory not found!');
        process.exit(1);
    }

    // Get all IFC files
    const ifcFiles = fs.readdirSync(IFC_FILES_DIR)
        .filter(file => file.toLowerCase().endsWith('.ifc'))
        .sort();

    if (ifcFiles.length === 0) {
        console.log('⚠️  No IFC files found in IFC FILES directory');
        return;
    }

    console.log(`📋 Found ${ifcFiles.length} IFC files to convert:\n`);
    ifcFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Convert each file
    const results = [];
    const startTime = Date.now();

    for (const ifcFile of ifcFiles) {
        const ifcFilePath = path.join(IFC_FILES_DIR, ifcFile);
        const fragmentFileName = ifcFile.replace(/\.ifc$/i, '.frag');
    const fragmentFilePath = path.join(MODELS_DIR, fragmentFileName);

        // Skip if fragment file already exists and is newer
        if (fs.existsSync(fragmentFilePath)) {
            const ifcStats = fs.statSync(ifcFilePath);
            const fragStats = fs.statSync(fragmentFilePath);
            
            if (fragStats.mtime > ifcStats.mtime) {
                console.log(`⏭️  Skipping ${ifcFile} (fragment is up to date)`);
                continue;
            }
        }

        const result = await convertIFCToFragment(ifcFilePath, fragmentFilePath);
        result.fileName = ifcFile;
        results.push(result);
    }

    // Summary
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(1);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log('═'.repeat(60));
    console.log('📊 CONVERSION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
        const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
        const totalFragmentSize = successful.reduce((sum, r) => sum + r.fragmentSize, 0);
        const averageCompression = successful.reduce((sum, r) => sum + r.compressionRatio, 0) / successful.length;

        console.log(`📏 Total original size: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`📦 Total fragment size: ${(totalFragmentSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`🗜️  Average compression: ${averageCompression.toFixed(1)}%`);
        console.log('');
        console.log('✅ Successfully converted files:');
        successful.forEach(r => {
            console.log(`   • ${r.fileName.replace('.ifc', '.frag')}`);
        });
    }

    if (failed.length > 0) {
        console.log('');
        console.log('❌ Failed conversions:');
        failed.forEach(r => {
            console.log(`   • ${r.fileName}: ${r.error}`);
        });
    }

    console.log('');
    console.log('🎉 Conversion process completed!');
    console.log(`🏷️  Station: ${STATION}`);
    console.log(`📁 Fragment files saved in: ${MODELS_DIR}`);
}

/**
 * Create a manifest file with model information
 */
function createModelManifest() {
    const fragmentFiles = fs.readdirSync(MODELS_DIR)
        .filter(file => file.toLowerCase().endsWith('.frag'))
        .map(file => {
            const filePath = path.join(MODELS_DIR, file);
            const stats = fs.statSync(filePath);
            const modelId = file.replace('.frag', '');
            return {
                id: modelId,
                name: file,
                path: `models/${STATION}/${file}`,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                description: getModelDescription(modelId)
            };
        });

    const manifest = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        models: fragmentFiles
    };

    const manifestPath = path.join(MODELS_DIR, 'models-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Created model manifest: ${manifestPath}`);
}

/**
 * Get a human-readable description for a model
 */
function getModelDescription(modelId) {
    const descriptions = {
        'NCRTC-DM009-AYE-SAHI-STN-M3-PI-00121': 'Plumbing & Infrastructure Model',
        'NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121': 'Architecture Model',
        'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00121': 'Structural Model 1',
        'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00122': 'Structural Model 2',
        'NCRTC-DM009-AYE-SAHI-STN-M3-ST-00124': 'Structural Model 3'
    };
    
    return descriptions[modelId] || 'BIM Model';
}

// Run the conversion if this script is executed directly (ESM main check)
const isMain = (() => {
    try {
        return import.meta.url === pathToFileURL(process.argv[1]).href;
    } catch {
        return false;
    }
})();

if (isMain) {
    (async () => {
        try {
            await convertAllIFCFiles();
            createModelManifest();
            console.log('\n🎯 Ready to use in your BIM viewer!');
            process.exit(0);
        } catch (error) {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        }
    })();
}