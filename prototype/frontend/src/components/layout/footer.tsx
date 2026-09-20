export function Footer() {
  return (
    <footer className='border-t border-border/80 bg-background/50 py-6 px-6 text-xs text-muted-foreground'>
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto'>
        <div className='flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left'>
          <span className='font-semibold text-foreground'>SkyRate (SIH26056)</span>
          <span className='hidden sm:inline'>·</span>
          <span>Automated Airfare Price Index & Surge Surveillance System</span>
        </div>
        <div className='flex items-center gap-4 text-[11px]'>
          <span>DGCA Economic Analysis</span>
          <span>·</span>
          <span>MoSPI CPI Base 100</span>
          <span>·</span>
          <span className='font-mono'>FastAPI v1</span>
        </div>
      </div>
    </footer>
  );
}
