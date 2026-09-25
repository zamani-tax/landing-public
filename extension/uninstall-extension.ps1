# حذفِ سیاستِ نصبِ افزونهٔ «دستیار زمانی».
# با راست‌کلیک → Run with PowerShell اجرا کنید؛ خودش دسترسیِ Administrator را می‌گیرد.
param(
    [string]$ExtensionId = "anbdldacigagfakfjjhfpbcgjdbjdcjn",
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

if (-not (Test-Admin)) {
    $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"{0}"' -f $PSCommandPath),
                 '-ExtensionId', ('"{0}"' -f $ExtensionId))
    if ($Edge) { $argList += '-Edge' }
    try { Start-Process powershell -Verb RunAs -ArgumentList $argList }
    catch { Show-Msg "حذف انجام نشد: پنجرهٔ تأیید ویندوز (Administrator) را باید قبول کنید." "Warning" }
    return
}

$found = $false; $err = $null
foreach ($vendor in @("Google\Chrome") + $(if ($Edge) { @("Microsoft\Edge") } else { @() })) {
    $base = "HKLM:\SOFTWARE\Policies\$vendor\ExtensionSettings\$ExtensionId"
    if (Test-Path $base) {
        try { Remove-Item $base -Recurse -Force; $found = $true }
        catch { $err = $_.Exception.Message }
    }
}
if ($err) {
    Show-Msg "خطا در حذف:`n$err" "Error"
} elseif ($found) {
    Show-Msg "حذف انجام شد.`n`nکروم را ببندید و باز کنید. اگر افزونه هنوز هست، از chrome://extensions هم می‌توانید حذفش کنید."
} else {
    Show-Msg "سیاستی برای این افزونه پیدا نشد (شاید از قبل حذف شده)." "Warning"
}
