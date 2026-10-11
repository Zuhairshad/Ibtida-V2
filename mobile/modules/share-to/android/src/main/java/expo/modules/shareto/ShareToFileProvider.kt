package expo.modules.shareto

import androidx.core.content.FileProvider

/** Its own subclass so it never clashes with another library's FileProvider declaration. */
class ShareToFileProvider : FileProvider()
