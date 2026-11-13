# Adds the camera permission to the freshly generated Android project.
p='android/app/src/main/AndroidManifest.xml'
s=open(p).read()
if 'android.permission.CAMERA' not in s:
    s=s.replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',1)
    open(p,'w').write(s)
print('manifest ok')
