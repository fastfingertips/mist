use std::env;

pub fn expand_env_vars(path: &str) -> String {
    let mut expanded = path.to_string();

    // Windows style %VAR%
    let re = regex::Regex::new(r"%([^%]+)%").unwrap();
    for cap in re.captures_iter(path) {
        let var_name = &cap[1];
        if let Ok(value) = env::var(var_name) {
            expanded = expanded.replace(&cap[0], &value);
        }
    }

    expanded
}

#[cfg(target_os = "windows")]
pub fn get_windows_accent_color() -> Option<String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // Try DWM ColorizationColor (Usually ARGB)
    if let Ok(dwm) = hkcu.open_subkey("Software\\Microsoft\\Windows\\DWM") {
        if let Ok(color) = dwm.get_value::<u32, _>("ColorizationColor") {
            return Some(format!("#{:06X}", color & 0x00FFFFFF));
        }
    }

    // Fallback: Explorer AccentColorMenu (Usually ABGR)
    if let Ok(accent) =
        hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent")
    {
        if let Ok(color) = accent.get_value::<u32, _>("AccentColorMenu") {
            let r = color & 0xFF;
            let g = (color >> 8) & 0xFF;
            let b = (color >> 16) & 0xFF;
            return Some(format!("#{:02X}{:02X}{:02X}", r, g, b));
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
pub fn get_windows_accent_color() -> Option<String> {
    None
}
