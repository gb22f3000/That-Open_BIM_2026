import { Camera, OrthographicCamera, PerspectiveCamera } from 'three'

export function isPerspectiveCamera(camera: Camera | PerspectiveCamera): camera is PerspectiveCamera {
  return 'isPerspectiveCamera' in camera && camera.isPerspectiveCamera
}

export function isOrthographicCamera(camera: Camera | OrthographicCamera): camera is PerspectiveCamera {
  return 'isOrthographicCamera' in camera && camera.isOrthographicCamera
}
