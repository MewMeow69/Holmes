; Tauri v2 NSIS template for Holmes
; Customizes the default Tauri installer with branding and taskbar pin option

; Override product name
!define PRODUCTNAME "Holmes"
!define MANUFACTURER "Holmes"

; Taskbar pin section
Section "Pin to Taskbar" SecTaskbar
  CreateShortCut "$INSTDIR\Holmes_Pin.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$shell = New-Object -ComObject Shell.Application; $folder = $shell.Namespace(\"$INSTDIR\"); $item = $folder.ParseName(\"Holmes_Pin.lnk\"); if ($item) { $item.InvokeVerb(\"taskbarpin\") }"'
  Delete "$INSTDIR\Holmes_Pin.lnk"
SectionEnd

; Remove user data on uninstall
!macro RemoveUserData
  SetShellVarContext current
  RMDir /r "$APPDATA\Holmes"
!macroend

; Add user data cleanup to uninstall
!macro customUnInstall
  !insertmacro RemoveUserData
!macroend
