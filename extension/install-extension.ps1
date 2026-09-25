# نصبِ افزونهٔ «دستیار زمانی» روی سیستمِ کاربر با به‌روزرسانیِ خودکار (بدونِ فروشگاه).
# با راست‌کلیک → Run with PowerShell اجرا کنید؛ خودش دسترسیِ Administrator را می‌گیرد.
# نتیجه در یک پنجرهٔ پیام نشان داده می‌شود (فارسی در کنسولِ ویندوز ناخواناست).
#
#   powershell -ExecutionPolicy Bypass -File .\install-extension.ps1 -SiteBaseUrl "https://example.com/extension"

param(
    [string]$SiteBaseUrl = "https://zamani.tax/extension",
    [string]$ExtensionId = "anbdldacigagfakfjjhfpbcgjdbjdcjn",
    [ValidateSet("normal_installed","force_installed")]
    [string]$Mode = "normal_installed",
    [switch]$Edge
)

Add-Type -AssemblyName System.Windows.Forms | Out-Null
function Show-Msg([string]$text, [string]$icon = "Information") {
    [void][System.Windows.Forms.MessageBox]::Show($text, "دستیار زمانی", 'OK', $icon)
}
try { Unblock-File -Path $PSCommandPath -ErrorAction SilentlyContinue } catch {}

function Test-Admin {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
        ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ── خود-ارتقا: «Run with PowerShell» ادمین نمی‌شود؛ خودمان با UAC دوباره اجرا می‌کنیم ──
if (-not (Test-Admin)) {
    $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"{0}"' -f $PSCommandPath),
                 '-SiteBaseUrl', ('"{0}"' -f $SiteBaseUrl), '-ExtensionId', ('"{0}"' -f $ExtensionId),
                 '-Mode', $Mode)
    if ($Edge) { $argList += '-Edge' }
    try {
        Start-Process powershell -Verb RunAs -ArgumentList $argList
    } catch {
        Show-Msg "نصب انجام نشد: برای نصب باید پنجرهٔ تأیید ویندوز (Administrator) را قبول کنید. دوباره تلاش کنید." "Warning"
    }
    return
}

# ── با دسترسیِ Administrator ──
$ErrorActionPreference = "Stop"
$updateUrl = $SiteBaseUrl.TrimEnd('/') + "/updates.xml"
try { $siteHost = ([uri]$SiteBaseUrl).Host } catch { $siteHost = $SiteBaseUrl }

function Set-ExtPolicy([string]$vendorPath) {
    $base = "HKLM:\SOFTWARE\Policies\$vendorPath\ExtensionSettings\$ExtensionId"
    New-Item -Path $base -Force | Out-Null
    New-ItemProperty -Path $base -Name "installation_mode" -Value $Mode      -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $base -Name "update_url"        -Value $updateUrl -PropertyType String -Force | Out-Null
}

try {
    Set-ExtPolicy "Google\Chrome"
    if ($Edge) { Set-ExtPolicy "Microsoft\Edge" }
    Show-Msg "نصب انجام شد.`n`nحالا کروم را کامل ببندید و دوباره باز کنید تا افزونهٔ «دستیار زمانی» از $siteHost بیاید.`n`nاگر بلافاصله ظاهر نشد، چند دقیقه صبر کنید یا کروم را دوباره باز کنید."
} catch {
    Show-Msg "نصب ناموفق بود:`n$($_.Exception.Message)`n`nمطمئن شوید پنجره با دسترسی Administrator باز شده است." "Error"
}
