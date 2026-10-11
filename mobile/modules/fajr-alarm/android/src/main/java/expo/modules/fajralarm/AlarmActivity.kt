package expo.modules.fajralarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import java.text.DateFormat
import java.util.Date

/**
 * The full-screen alarm, shown over the lock screen. While wake verification is on there is no
 * stop, snooze or back: the only way out is "Scan wudu station", which unlocks the phone and opens
 * Ibtida's scanner. The sound keeps going (in AlarmService) until the scan is verified.
 */
class AlarmActivity : Activity() {
  private val main = Handler(Looper.getMainLooper())
  private lateinit var clock: TextView
  private lateinit var title: TextView
  private lateinit var body: TextView
  private lateinit var action: TextView
  private var verify = true

  private val changed = object : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) = render()
  }

  private val tick = object : Runnable {
    override fun run() {
      clock.text = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date())
      main.postDelayed(this, 1000)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.statusBarColor = BG
    window.navigationBarColor = BG
    setContentView(build())
    if (Build.VERSION.SDK_INT >= 33) {
      // Back does nothing while verification is required.
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_OVERLAY) { if (!verify) finish() }
    }
  }

  override fun onResume() {
    super.onResume()
    val f = IntentFilter(AlarmService.ACTION_CHANGED)
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(changed, f, Context.RECEIVER_NOT_EXPORTED)
    else @Suppress("UnspecifiedRegisterReceiverFlag") registerReceiver(changed, f)
    main.post(tick)
    render()
  }

  override fun onPause() {
    super.onPause()
    try { unregisterReceiver(changed) } catch (e: Exception) { }
    main.removeCallbacks(tick)
  }

  @Deprecated("Back is handled by OnBackInvokedDispatcher on 33+")
  override fun onBackPressed() {
    if (!verify) @Suppress("DEPRECATION") super.onBackPressed()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    // Volume keys don't dismiss the alarm (they still change the volume through the system).
    if (keyCode == KeyEvent.KEYCODE_BACK && verify) return true
    return super.onKeyDown(keyCode, event)
  }

  private fun render() {
    val r = AlarmStore.ringing(this)
    if (r == null || r.silencedUntil > System.currentTimeMillis()) { finish(); return }
    verify = r.alarm.verify
    title.text = r.alarm.title
    body.text = r.alarm.body
    action.text = if (verify) "Scan wudu station" else "Stop alarm"
  }

  private fun onAction() {
    val r = AlarmStore.ringing(this) ?: run { finish(); return }
    if (!r.alarm.verify) {
      startService(Intent(this, AlarmService::class.java).setAction(AlarmService.ACTION_STOP))
      finish()
      return
    }
    // Unlock first (PIN / fingerprint), then open the scanner. The alarm keeps sounding meanwhile.
    val km = getSystemService(KeyguardManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && km?.isKeyguardLocked == true) {
      km.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
        override fun onDismissSucceeded() = openScanner(r.alarm.url)
      })
    } else {
      openScanner(r.alarm.url)
    }
  }

  private fun openScanner(url: String) {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return
    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      component = launch.component
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    })
  }

  /* ------------------------------------------------------------------ View */

  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)

  private fun text(size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
    setTextColor(color)
    setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    gravity = Gravity.CENTER
    if (bold) typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
  }

  private fun build(): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(Color.parseColor("#2A2440"), BG))
      val pad = dp(28f).toInt()
      setPadding(pad, dp(96f).toInt(), pad, dp(56f).toInt())
    }
    root.addView(text(12f, GOLD, bold = true).apply { text = "FAJR WAKE ALARM"; letterSpacing = 0.25f })
    clock = text(64f, Color.WHITE, bold = true).apply { setPadding(0, dp(18f).toInt(), 0, 0) }
    root.addView(clock)
    title = text(24f, Color.WHITE, bold = true).apply { setPadding(0, dp(18f).toInt(), 0, 0) }
    root.addView(title)
    body = text(15f, Color.parseColor("#B8B7BF")).apply { setPadding(0, dp(12f).toInt(), 0, 0); setLineSpacing(0f, 1.3f) }
    root.addView(body)
    root.addView(View(this), LinearLayout.LayoutParams(1, 0, 1f))
    root.addView(text(13f, Color.parseColor("#8F8E98")).apply {
      text = "The alarm stops after you scan your wudu station, then your prayer mat."
      setPadding(0, 0, 0, dp(16f).toInt())
    })
    action = text(18f, Color.parseColor("#111217"), bold = true).apply {
      background = GradientDrawable().apply { cornerRadius = dp(30f); setColor(Color.WHITE) }
      isClickable = true
      isFocusable = true
      contentDescription = "Scan wudu station"
      setOnClickListener { onAction() }
    }
    root.addView(action, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(60f).toInt()))
    return root
  }

  companion object {
    private val BG = Color.parseColor("#14151B")
    private val GOLD = Color.parseColor("#F2C48A")
  }
}
