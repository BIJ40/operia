/**
 * PublicGuideFooter - Footer simple pour le Guide Apogée public
 */

export function PublicGuideFooter() {
  return (
    <footer className="border-t bg-muted/30 py-3 mt-auto">
      <div className="container text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} HelpConfort Services - Guide Apogée</p>
      </div>
    </footer>
  );
}
