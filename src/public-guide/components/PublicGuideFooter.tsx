/**
 * PublicGuideFooter - Footer simple pour le Guide Apogée public
 * Version Warm Pastel
 */

export function PublicGuideFooter() {
  return (
    <footer className="border-t bg-gradient-to-r from-muted/30 to-muted/10 py-4 mt-auto">
      <div className="container text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} HelpConfort Services — Guide Apogée</p>
      </div>
    </footer>
  );
}
