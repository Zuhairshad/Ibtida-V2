import app from '../../../app.json';

type Plugin = string | [string, Record<string, unknown>];

describe('app permissions', () => {
  it('no plugin blocks the camera the wake scan needs', () => {
    // `cameraPermission: false` on expo-image-picker strips android.permission.CAMERA from the whole
    // app (tools:node="remove"), so expo-camera can never be granted and the wake scan can't open.
    const blocking = (app.expo.plugins as Plugin[])
      .filter((p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[1]?.cameraPermission === false)
      .map(p => p[0]);
    expect(blocking).toEqual([]);
  });

  it('keeps CAMERA in the Android permissions', () => {
    expect(app.expo.android.permissions).toContain('android.permission.CAMERA');
  });
});
