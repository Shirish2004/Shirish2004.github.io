document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('header');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    let lastScrollY = window.scrollY;

    function animateOnScroll() {
        const elements = document.querySelectorAll('[data-aos="fade-up"]');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            
            if (elementTop < window.innerHeight * 0.85 && elementBottom > 0) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0) translateX(0)';
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        if (window.scrollY > 500) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }

        animateOnScroll();
    });

    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            
            if (targetId.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const headerOffset = 80;
                    const elementPosition = targetSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }

                if (navMenu.classList.contains('active')) {
                    mobileMenuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            }
        });
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            projectCards.forEach(card => {
                const categories = card.getAttribute('data-category');
                
                if (filter === 'all' || categories.includes(filter)) {
                    card.style.display = 'flex';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(30px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    const skillBars = document.querySelectorAll('.skill-progress');
    
    function animateSkillBars() {
        skillBars.forEach(bar => {
            const barTop = bar.getBoundingClientRect().top;
            
            if (barTop < window.innerHeight * 0.85) {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            }
        });
    }

    let skillsAnimated = false;
    window.addEventListener('scroll', () => {
        if (!skillsAnimated) {
            const skillsSection = document.getElementById('skills');
            if (skillsSection) {
                const skillsTop = skillsSection.getBoundingClientRect().top;
                if (skillsTop < window.innerHeight * 0.75) {
                    animateSkillBars();
                    skillsAnimated = true;
                }
            }
        }
    });

    animateOnScroll();

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) translateX(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-aos="fade-up"]').forEach(element => {
        observer.observe(element);
    });

    const glitchText = document.querySelector('.glitch-text');
    if (glitchText) {
        setInterval(() => {
            if (Math.random() > 0.95) {
                glitchText.style.textShadow = `
                    ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 var(--accent-primary),
                    ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 0 var(--accent-secondary)
                `;
                
                setTimeout(() => {
                    glitchText.style.textShadow = 'none';
                }, 100);
            }
        }, 2000);
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    const cursorFollower = document.createElement('div');
    cursorFollower.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--accent-primary);
        opacity: 0.3;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.2s ease;
        display: none;
    `;
    document.body.appendChild(cursorFollower);

    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (window.innerWidth > 968) {
            cursorFollower.style.display = 'block';
        }
    });

    function animateCursor() {
        const diffX = mouseX - followerX;
        const diffY = mouseY - followerY;
        
        followerX += diffX * 0.1;
        followerY += diffY * 0.1;
        
        cursorFollower.style.left = followerX - 10 + 'px';
        cursorFollower.style.top = followerY - 10 + 'px';
        
        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    document.querySelectorAll('a, button').forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursorFollower.style.transform = 'scale(2)';
        });
        
        element.addEventListener('mouseleave', () => {
            cursorFollower.style.transform = 'scale(1)';
        });
    });
});
