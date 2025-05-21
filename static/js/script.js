// Initialize AOS (Animate On Scroll)
AOS.init({
  duration: 800,
  easing: 'ease-in-out',
  once: true,
  mirror: false
})

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', function () {
  const navbar = document.getElementById('main-navbar') // Use the ID for precision
  if (!navbar) return

  // Always ensure the navbar has the scrolled class for consistent styling across all pages
  navbar.classList.add('scrolled')

  // Keep the scroll event listener for any additional styling you might want to add in the future
  window.addEventListener('scroll', function () {
    // The navbar will always have the scrolled class now
    // This is just a placeholder in case you want to add more scroll-based effects later
  })
})

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault()

    const target = document.querySelector(this.getAttribute('href'))
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: 'smooth'
      })
    }
  })
})

// Form submission handling
document.addEventListener('DOMContentLoaded', function () {
  const reportForm = document.getElementById('reportForm')
  if (reportForm) {
    reportForm.addEventListener('submit', function (e) {
      e.preventDefault()

      // Show success message
      const formSuccess = document.getElementById('formSuccess')
      if (formSuccess) {
        formSuccess.classList.remove('d-none')

        // Reset form
        setTimeout(() => {
          reportForm.reset()
        }, 500)

        // Hide success message after 5 seconds
        setTimeout(() => {
          formSuccess.classList.add('d-none')
        }, 5000)
      }
    })
  }
})

// Statistics counter animation
const statElements = document.querySelectorAll('.stat-number')
let animated = false

function animateStats () {
  if (animated) return

  statElements.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-counter'), 10)
    const duration = 2000 // 2 seconds
    const step = Math.ceil(target / (duration / 20)) // Update every 20ms
    let current = 0

    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      stat.textContent = current
    }, 20)
  })

  animated = true
}

// Trigger stats animation when section is in viewport
const statsSection = document.querySelector('.stats-section')
if (statsSection) {
  window.addEventListener('scroll', function () {
    const rect = statsSection.getBoundingClientRect()
    const isInViewport =
      rect.top <= window.innerHeight * 0.75 && rect.bottom >= 0

    if (isInViewport) {
      animateStats()
    }
  })
}

// Mobile menu closing when clicking a nav item
const navLinks = document.querySelectorAll('.navbar-nav .nav-link')
const navbarCollapse = document.querySelector('.navbar-collapse')

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navbarCollapse.classList.contains('show')) {
      navbarCollapse.classList.remove('show')
    }
  })
})

// Add current year to copyright in footer
const copyrightYear = document.querySelector('.footer-bottom .mb-0')
if (copyrightYear) {
  const year = new Date().getFullYear()
  copyrightYear.textContent = copyrightYear.textContent.replace('2023', year)
}
