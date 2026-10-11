package expo.modules.shareto

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Shares an image straight to one app (WhatsApp, Instagram): the app opens with the image and
 * offers its own choices — WhatsApp: a chat or My status; Instagram: Story, Post, Reel or a message.
 */
class ShareToModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ShareTo")

    /** Which of the given packages are installed. */
    Function("installed") { packages: List<String> ->
      packages.filter { isInstalled(it) }
    }

    /**
     * Sends [path] (a file in the app cache, e.g. a captured post) to [packageName], with an
     * optional caption. Returns false when that app isn't installed.
     */
    AsyncFunction("shareImage") { path: String, packageName: String, caption: String? ->
      val ctx = context
      if (!isInstalled(packageName)) return@AsyncFunction false
      val file = File(Uri.parse(path).path ?: path)
      if (!file.exists()) throw IllegalArgumentException("Image not found")
      val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.shareto", file)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        if (!caption.isNullOrBlank()) putExtra(Intent.EXTRA_TEXT, caption)
        clipData = ClipData.newRawUri(null, uri)
        setPackage(packageName)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(intent) else ctx.startActivity(intent)
      true
    }
  }

  private fun isInstalled(pkg: String): Boolean = try {
    context.packageManager.getPackageInfo(pkg, 0)
    true
  } catch (e: PackageManager.NameNotFoundException) {
    false
  }
}
