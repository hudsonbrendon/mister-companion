// Ad-hoc code-sign the macOS .app so Apple Silicon does not flag it as "damaged".
// There is no paid Apple Developer ID, so this is an ad-hoc signature only — users
// still clear the download quarantine on first launch (see README "Installing the
// prebuilt apps"). On non-macOS builds this hook is a no-op.
const { execSync } = require('node:child_process')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
}
