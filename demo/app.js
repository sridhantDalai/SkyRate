/**
 * SKYRATE — Real-Time Airfare Price Intelligence for CPI Augmentation
 * Smart India Hackathon 2026 Interactive Presentation Controller
 */

let currentSlide = 1;
const totalSlides = 8;
let slideTimers = [];

document.addEventListener('DOMContentLoaded', () => {
  initPresentation();
});

function initPresentation() {
  const urlParams = new URLSearchParams(window.location.search);
  const stageParam = urlParams.get('stage');
  if (stageParam && !isNaN(stageParam)) {
    currentSlide = parseInt(stageParam, 10);
  } else if (window.location.hash) {
    const hashNum = parseInt(window.location.hash.replace('#slide', ''), 10);
    if (!isNaN(hashNum)) currentSlide = hashNum;
  }
  if (currentSlide < 1 || currentSlide > totalSlides) currentSlide = 1;

  updateSlideView();
  triggerSlideAnimations(currentSlide);

  // Keyboard navigation listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    }
  });
}

/**
 * Slide Navigation Handlers
 */
function nextSlide() {
  if (currentSlide < totalSlides) {
    goToSlide(currentSlide + 1);
  } else {
    // Restart Demo on final slide
    goToSlide(1);
  }
}

function prevSlide() {
  if (currentSlide > 1) {
    goToSlide(currentSlide - 1);
  }
}

function goToSlide(slideNum) {
  if (slideNum < 1 || slideNum > totalSlides) return;
  currentSlide = slideNum;
  clearSlideTimers();
  updateSlideView();
  triggerSlideAnimations(currentSlide);
}

function clearSlideTimers() {
  slideTimers.forEach(t => clearTimeout(t));
  slideTimers = [];
}

/**
 * Updates DOM active states, dots, header pill, and buttons
 */
function updateSlideView() {
  // Update slide visibility
  for (let i = 1; i <= totalSlides; i++) {
    const slide = document.getElementById(`slide${i}`);
    if (slide) {
      if (i === currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    }
  }

  // Update dots
  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot, idx) => {
    if (idx + 1 === currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Update Header Step Indicator
  const stepPill = document.getElementById('stepPill');
  if (stepPill) {
    stepPill.innerText = `Step ${currentSlide} / ${totalSlides}`;
  }

  // Update Buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (prevBtn) {
    prevBtn.disabled = (currentSlide === 1);
  }

  if (nextBtn) {
    if (currentSlide === totalSlides) {
      nextBtn.innerText = 'RESTART DEMO ↺';
      nextBtn.className = 'btn btn-primary';
    } else {
      nextBtn.innerText = 'NEXT →';
      nextBtn.className = 'btn btn-primary';
    }
  }
}

/**
 * Trigger fast visual animations per slide
 */
function triggerSlideAnimations(slideNum) {
  switch (slideNum) {
    case 2:
      animateSlide2();
      break;
    case 3:
      animateSlide3();
      break;
    case 4:
      animateSlide4();
      break;
    case 6:
      animateSlide6();
      break;
    default:
      break;
  }
}

/**
 * Slide 2 Animation: Anomaly detection visual trigger
 */
function animateSlide2() {
  const anomCard = document.getElementById('anomalyDemoCard');

  if (anomCard) {
    anomCard.style.transform = 'scale(1)';
    const timer1 = setTimeout(() => {
      anomCard.style.transform = 'scale(1.08)';
    }, 400);
    slideTimers.push(timer1);
  }
}

/**
 * Slide 3 Animation: Unified Dataset flow in (2-3 seconds)
 */
function animateSlide3() {
  const row1 = document.getElementById('s3Row1');
  const row2 = document.getElementById('s3Row2');
  const row3 = document.getElementById('s3Row3');
  const row4 = document.getElementById('s3Row4');
  const unifiedBadge = document.getElementById('unifiedBadge');
  const dbStatus = document.getElementById('s3DbStatus');

  // Reset states
  [row1, row2, row3, row4].forEach(r => r && r.classList.remove('active'));
  if (unifiedBadge) unifiedBadge.classList.remove('active');
  if (dbStatus) dbStatus.style.opacity = '0.5';

  // 1. Airfare flows in
  const t1 = setTimeout(() => {
    if (row1) row1.classList.add('active');
  }, 200);

  // 2. DGCA Weights flow in
  const t2 = setTimeout(() => {
    if (row2) row2.classList.add('active');
  }, 600);

  // 3. Fuel/Oil flows in
  const t3 = setTimeout(() => {
    if (row3) row3.classList.add('active');
  }, 1000);

  // 4. Other sources flow in
  const t4 = setTimeout(() => {
    if (row4) row4.classList.add('active');
  }, 1400);

  // 5. Merge into UNIFIED DATASET & Database Store
  const t5 = setTimeout(() => {
    if (unifiedBadge) unifiedBadge.classList.add('active');
    if (dbStatus) {
      dbStatus.style.opacity = '1';
      dbStatus.innerText = 'Stored ✓';
    }
  }, 1900);

  slideTimers.push(t1, t2, t3, t4, t5);
}

/**
 * Slide 4 Animation: Timer countdown and fast fare update
 */
function animateSlide4() {
  const timerDisplay = document.getElementById('timerDisplay');
  const refreshPill = document.getElementById('refreshTriggeredPill');
  const newFare1 = document.getElementById('newFare1');
  const newFare2 = document.getElementById('newFare2');

  if (timerDisplay) timerDisplay.innerText = 'Next refresh: 00:30';
  if (refreshPill) refreshPill.classList.remove('active');

  const t1 = setTimeout(() => {
    if (timerDisplay) timerDisplay.innerText = 'Next refresh: 00:29';
  }, 400);

  const t2 = setTimeout(() => {
    if (timerDisplay) timerDisplay.innerText = 'Next refresh: 00:28';
  }, 800);

  const t3 = setTimeout(() => {
    if (timerDisplay) timerDisplay.innerText = 'Refresh Triggered ✓';
    if (refreshPill) refreshPill.classList.add('active');

    // Highlight new fares
    if (newFare1) newFare1.style.color = '#10B981';
    if (newFare2) newFare2.style.color = '#10B981';
  }, 1300);

  slideTimers.push(t1, t2, t3);
}

/**
 * Slide 6 Animation: Training progress fill
 */
function animateSlide6() {
  const progressBar = document.getElementById('trainProgressBar');
  const percentText = document.getElementById('trainPercentText');
  const statusText = document.getElementById('trainStatusText');
  const readyBadge = document.getElementById('modelReadyBadge');

  if (progressBar) progressBar.style.width = '0%';
  if (percentText) percentText.innerText = '0%';
  if (statusText) statusText.innerText = 'Training Model...';
  if (readyBadge) readyBadge.classList.remove('active');

  const t1 = setTimeout(() => {
    if (progressBar) progressBar.style.width = '85%';
    if (percentText) percentText.innerText = '85%';
  }, 300);

  const t2 = setTimeout(() => {
    if (progressBar) progressBar.style.width = '100%';
    if (percentText) percentText.innerText = '100%';
    if (statusText) statusText.innerText = 'Training Complete';
    if (readyBadge) readyBadge.classList.add('active');
  }, 1000);

  slideTimers.push(t1, t2);
}
