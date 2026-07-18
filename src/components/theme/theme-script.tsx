// Sets the theme before first paint to avoid a flash.
// Supports "system" (follows the device), "dark", "light".
export function ThemeScript() {
  const code = `(function(){try{
    var pref = localStorage.getItem('atlas-theme') || 'system';
    var sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
