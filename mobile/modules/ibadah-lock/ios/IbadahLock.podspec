Pod::Spec.new do |s|
  s.name           = 'IbadahLock'
  s.version        = '1.0.0'
  s.summary        = 'Ibadah Lock app shielding (iOS stub: FamilyControls entitlement not granted)'
  s.description    = 'Local Expo module for Ibtida. On iOS it reports unsupported until the FamilyControls entitlement is approved.'
  s.author         = 'Ibtida'
  s.homepage       = 'https://ibtida.app'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = "**/*.{h,m,swift}"
end
