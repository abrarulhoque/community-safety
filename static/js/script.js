// Modern Community Safety Platform JavaScript

document.addEventListener('DOMContentLoaded', function () {
  // Initialize all features
  initNavbar()
  initFAQ()
  initCounters()
  initSmoothScrolling()
  initAnimations()
  initFormValidation()
})

// ===== NAVBAR FUNCTIONALITY =====
function initNavbar () {
  const navbar = document.getElementById('main-navbar')
  if (!navbar) return

  // Handle navbar scroll effect
  function handleScroll () {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled')
    } else {
      navbar.classList.remove('scrolled')
    }
  }

  // Throttle scroll events for better performance
  let ticking = false
  function throttledScroll () {
    if (!ticking) {
      requestAnimationFrame(function () {
        handleScroll()
        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener('scroll', throttledScroll)

  // Handle mobile menu
  const navbarToggler = navbar.querySelector('.navbar-toggler')
  const navbarCollapse = navbar.querySelector('.navbar-collapse')

  if (navbarToggler && navbarCollapse) {
    navbarToggler.addEventListener('click', function () {
      navbarCollapse.classList.toggle('show')
    })

    // Close mobile menu when clicking on links
    const navLinks = navbarCollapse.querySelectorAll('.nav-link')
    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        if (window.innerWidth < 992) {
          navbarCollapse.classList.remove('show')
        }
      })
    })
  }

  // Update active nav link on scroll
  const sections = document.querySelectorAll('section[id]')
  const navLinks = navbar.querySelectorAll('.nav-link[href^="#"]')

  function updateActiveNavLink () {
    const scrollPosition = window.scrollY + 100

    sections.forEach(section => {
      const sectionTop = section.offsetTop
      const sectionHeight = section.offsetHeight
      const sectionId = section.getAttribute('id')

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionTop + sectionHeight
      ) {
        navLinks.forEach(link => {
          link.classList.remove('active')
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active')
          }
        })
      }
    })
  }

  window.addEventListener('scroll', throttledScroll)
}

// ===== FAQ FUNCTIONALITY =====
function initFAQ () {
  const faqItems = document.querySelectorAll('.faq-item')

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question')
    const answer = item.querySelector('.faq-answer')
    const toggle = item.querySelector('.faq-toggle')

    if (question && answer && toggle) {
      question.addEventListener('click', function () {
        const isActive = item.classList.contains('active')

        // Close all other FAQ items
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active')
            const otherAnswer = otherItem.querySelector('.faq-answer')
            if (otherAnswer) {
              otherAnswer.style.maxHeight = null
            }
          }
        })

        // Toggle current FAQ item
        if (isActive) {
          item.classList.remove('active')
          answer.style.maxHeight = null
        } else {
          item.classList.add('active')
          answer.style.maxHeight = answer.scrollHeight + 'px'
        }
      })
    }
  })

  // Open first FAQ item by default
  if (faqItems.length > 0) {
    const firstItem = faqItems[0]
    const firstAnswer = firstItem.querySelector('.faq-answer')
    if (firstAnswer) {
      firstItem.classList.add('active')
      firstAnswer.style.maxHeight = firstAnswer.scrollHeight + 'px'
    }
  }
}

// ===== COUNTER ANIMATIONS =====
function initCounters () {
  const counters = document.querySelectorAll('[data-counter]')
  const observerOptions = {
    threshold: 0.7,
    rootMargin: '0px 0px -50px 0px'
  }

  const animateCounter = counter => {
    const target = parseInt(counter.getAttribute('data-counter'))
    const duration = 2000 // 2 seconds
    const increment = target / (duration / 16) // 60fps
    let current = 0

    const updateCounter = () => {
      current += increment
      if (current < target) {
        counter.textContent = Math.floor(current)
        requestAnimationFrame(updateCounter)
      } else {
        counter.textContent = target
      }
    }

    updateCounter()
  }

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
        entry.target.classList.add('counted')
        animateCounter(entry.target)
      }
    })
  }, observerOptions)

  counters.forEach(counter => {
    counterObserver.observe(counter)
  })
}

// ===== SMOOTH SCROLLING =====
function initSmoothScrolling () {
  const scrollLinks = document.querySelectorAll('a[href^="#"]')

  scrollLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href')

      // Skip if it's just a hash
      if (href === '#') return

      const target = document.querySelector(href)
      if (target) {
        e.preventDefault()

        const headerOffset = 80 // Account for fixed navbar
        const elementPosition = target.offsetTop
        const offsetPosition = elementPosition - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    })
  })
}

// ===== SCROLL ANIMATIONS =====
function initAnimations () {
  // Initialize AOS (Animate On Scroll) if available
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 100
    })
  }

  // Parallax effect for hero background
  const heroSection = document.querySelector('.hero-section')
  if (heroSection) {
    window.addEventListener('scroll', function () {
      const scrolled = window.pageYOffset
      const rate = scrolled * -0.5

      const heroBackground = heroSection.querySelector('.hero-background')
      if (heroBackground) {
        heroBackground.style.transform = `translateY(${rate}px)`
      }
    })
  }

  // Floating animations for hero cards
  const floatingCards = document.querySelectorAll('.floating')
  floatingCards.forEach((card, index) => {
    const delay = index * 0.5
    card.style.animationDelay = `${delay}s`
  })
}

// ===== FORM VALIDATION =====
function initFormValidation () {
  const forms = document.querySelectorAll('form')

  forms.forEach(form => {
    form.addEventListener('submit', function (e) {
      if (!validateForm(this)) {
        e.preventDefault()
        e.stopPropagation()
      }
      this.classList.add('was-validated')
    })

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      input.addEventListener('blur', function () {
        validateField(this)
      })

      input.addEventListener('input', function () {
        if (this.classList.contains('is-invalid')) {
          validateField(this)
        }
      })
    })
  })

  // Handle report form specifically
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
}

function validateForm (form) {
  let isValid = true
  const inputs = form.querySelectorAll(
    'input[required], select[required], textarea[required]'
  )

  inputs.forEach(input => {
    if (!validateField(input)) {
      isValid = false
    }
  })

  return isValid
}

function validateField (field) {
  const value = field.value.trim()
  const type = field.type
  let isValid = true
  let errorMessage = ''

  // Check if required field is empty
  if (field.hasAttribute('required') && !value) {
    isValid = false
    errorMessage = 'This field is required.'
  }

  // Email validation
  else if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      isValid = false
      errorMessage = 'Please enter a valid email address.'
    }
  }

  // Phone validation
  else if (type === 'tel' && value) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      isValid = false
      errorMessage = 'Please enter a valid phone number.'
    }
  }

  // Password strength validation
  else if (type === 'password' && value) {
    if (value.length < 8) {
      isValid = false
      errorMessage = 'Password must be at least 8 characters long.'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      isValid = false
      errorMessage =
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
    }
  }

  // Update field appearance
  if (isValid) {
    field.classList.remove('is-invalid')
    field.classList.add('is-valid')
    removeErrorMessage(field)
  } else {
    field.classList.remove('is-valid')
    field.classList.add('is-invalid')
    showErrorMessage(field, errorMessage)
  }

  return isValid
}

function showErrorMessage (field, message) {
  removeErrorMessage(field)

  const errorDiv = document.createElement('div')
  errorDiv.className = 'invalid-feedback'
  errorDiv.textContent = message

  field.parentNode.appendChild(errorDiv)
}

function removeErrorMessage (field) {
  const existingError = field.parentNode.querySelector('.invalid-feedback')
  if (existingError) {
    existingError.remove()
  }
}

// ===== ACCESSIBILITY IMPROVEMENTS =====

// Keyboard navigation for custom elements
document.addEventListener('keydown', function (e) {
  // Handle Enter key on FAQ questions
  if (e.key === 'Enter' && e.target.classList.contains('faq-question')) {
    e.target.click()
  }

  // Handle Escape key to close mobile menu
  if (e.key === 'Escape') {
    const navbarCollapse = document.querySelector('.navbar-collapse.show')
    if (navbarCollapse) {
      navbarCollapse.classList.remove('show')
    }
  }
})

// Add current year to copyright in footer
const copyrightYear = document.querySelector('.footer-bottom .mb-0')
if (copyrightYear) {
  const year = new Date().getFullYear()
  copyrightYear.textContent = copyrightYear.textContent.replace('2023', year)
}
