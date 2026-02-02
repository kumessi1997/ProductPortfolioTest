
// Initialize Loading Rive Animation
const loadingRive = new rive.Rive({
    src: 'loading_motion.riv',
    canvas: document.getElementById('loadingCanvas'),
    autoplay: true,
    artboard: 'render',
    stateMachines: 'State Machine 1',
    onLoad: () => {
        loadingRive.resizeDrawingSurfaceToCanvas();
    },
});

// Load Main Rive Animation
const r = new rive.Rive({
    src: "test.riv",
    canvas: document.getElementById("riveCanvas"),
    autoplay: true,
    autoBind: true,
    isTouchScrollEnabled: true,
    stateMachines: "State Machine 1",
    artboard: "Main",
    onLoad: () => {
        r.resizeDrawingSurfaceToCanvas();
        // Hide loading overlay when main animation is ready
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => {
                overlay.style.display = 'none';
                loadingRive.stop(); // Stop the loader to save resources
            }, 500);
        }
    },
});

function onRiveEventReceived(riveEvent) {
    const eventData = riveEvent.data;
    console.log(eventData); // <-- Add this line

    if (eventData.name === "akabot_fb") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    } else if (eventData.name === "akabot_web") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    } else if (eventData.name === "akabot_linkedin") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    } else if (eventData.name === "ubot_fb") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    } else if (eventData.name === "ubot_web") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    } else if (eventData.name === "ubot_linkedin") {
        if (eventData.url) {
            window.open(eventData.url);
        } else {
            alert('No URL provided for this event!');
        }
    }
}

r.on(rive.EventType.RiveEvent, onRiveEventReceived);
// Adjust canvas size on window resize for full responsiveness
window.addEventListener('resize', () => {
    r.resizeDrawingSurfaceToCanvas();
});

//water background
const waterHighlights = document.querySelector('.water-highlights');
const particleContainer = document.querySelector('.particle-container');
const waterBackground = document.querySelector('.water-background');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

function updateHighlightPosition() {
    const targetX = (mouseX / window.innerWidth) * 100;
    const targetY = (mouseY / window.innerHeight) * 100;

    const currentX = parseFloat(waterHighlights.style.getPropertyValue('--highlight-x') || 50);
    const currentY = parseFloat(waterHighlights.style.getPropertyValue('--highlight-y') || 50);

    const lerpFactor = 0.05;
    const newX = currentX + (targetX - currentX) * lerpFactor;
    const newY = currentY + (targetY - currentY) * lerpFactor;

    waterHighlights.style.setProperty('--highlight-x', `${newX}%`);
    waterHighlights.style.setProperty('--highlight-y', `${newY}%`);

    waterHighlights.style.setProperty('--highlight-opacity', '0.8');
}

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    const endX = (Math.random() - 0.5) * 100;
    const endY = (Math.random() - 0.5) * 100;
    particle.style.setProperty('--particle-end-x', `${endX}px`);
    particle.style.setProperty('--particle-end-y', `${endY}px`);

    particleContainer.appendChild(particle);

    particle.addEventListener('animationend', () => {
        particle.remove();
    });
}

let lastParticleTime = 0;
const particleInterval = 100;

window.addEventListener('mousemove', (event) => {
    const currentTime = Date.now();
    if (currentTime - lastParticleTime > particleInterval) {
        createParticle(event.clientX + (Math.random() - 0.5) * 10, event.clientY + (Math.random() - 0.5) * 10);
        lastParticleTime = currentTime;
    }
});

function animate() {
    updateHighlightPosition();
    requestAnimationFrame(animate);
}

animate();




// Slide Modal Functions
function openSlideModal() {
    document.getElementById('slideModalOverlay').classList.add('active');
}
function closeSlideModal() {
    document.getElementById('slideModalOverlay').classList.remove('active');
}

// Video Modal Functions
const videoModalOverlay = document.getElementById('videoModalOverlay');

function openVideoModal() {
    videoModalOverlay.style.display = 'flex';
}

function closeVideoModal() {
    videoModalOverlay.style.display = 'none';
    // Stop video playback by resetting src
    const iframe = videoModalOverlay.querySelector('iframe');
    if (iframe) {
        const src = iframe.src;
        iframe.src = src;
    }
}

// Contact Modal Functions
function openContactModal() {
    document.getElementById('contactModalOverlay').classList.add('active');
}

function closeContactModal() {
    document.getElementById('contactModalOverlay').classList.remove('active');
}

document.getElementById('contactForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const message = document.getElementById('message').value;

    const formData = {
        name: name,
        email: email,
        phone: phone,
        message: message,
        timestamp: new Date().toISOString()
    };

    console.log('Form Data:', formData);

    // In a real application, you would send this formData to a server-side endpoint.
    // Example using fetch API (requires a backend to handle the request):
    /*
    fetch('/save-contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        alert('Your inquiry has been submitted!');
        closeContactModal();
        document.getElementById('contactForm').reset(); // Clear the form
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('There was an error submitting your inquiry. Please try again later.');
    });
    */

    alert('Your inquiry has been submitted! (Data logged to console)');
    closeContactModal();
    document.getElementById('contactForm').reset(); // Clear the form
});



