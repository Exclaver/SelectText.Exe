let textVisible = true;
let hasProcessedOCR = false;

// Add the processScreenshot function that was missing
function processScreenshot(video) {
  return new Promise((resolve) => {
    // Get video dimensions and position
    const videoRect = video.getBoundingClientRect();
    const scale = window.devicePixelRatio;

    chrome.runtime.sendMessage({ action: "takeScreenshot" }, function(response) {
      if (response && response.screenshot) {
        // Create canvas to crop the screenshot
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to video dimensions
          canvas.width = videoRect.width * scale;
          canvas.height = videoRect.height * scale;
          
          // Draw only the video portion
          ctx.drawImage(img, 
            videoRect.left * scale, videoRect.top * scale, // Source x,y
            videoRect.width * scale, videoRect.height * scale, // Source width,height
            0, 0, // Destination x,y
            canvas.width, canvas.height // Destination width,height
          );

          // Get cropped image data
          const croppedImage = canvas.toDataURL('image/jpeg');
          const base64Image = croppedImage.split(",")[1];
          
          const apiKey = "AIzaSyCtO1oprbK6g-kK-LHR2HxnOhvgeS7Rilo";
          const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
          const requestBody = {
            requests: [{
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }]
            }]
          };

          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
          })
          .then(response => response.json())
          .then(responseData => {
            if (!responseData.error) {
              const words = responseData.responses[0].textAnnotations.slice(1).map(annotation => ({
                text: annotation.description,
                // Adjust coordinates relative to video position
                y: (annotation.boundingPoly.vertices[0].y / scale) + videoRect.top,
                x: (annotation.boundingPoly.vertices[0].x / scale) + videoRect.left,
                height: (annotation.boundingPoly.vertices[2].y - annotation.boundingPoly.vertices[0].y) / scale,
                width: (annotation.boundingPoly.vertices[2].x - annotation.boundingPoly.vertices[0].x) / scale
              }));
              resolve(words);
            }
          })
          .catch(error => {
            console.error('OCR Error:', error);
            resolve(null);
          });
        };
        img.src = response.screenshot;
      }
    });
  });
}
function injectCSS() {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('style.css');
    link.onload = () => resolve();
    link.onerror = (e) => console.error('CSS loading failed:', e);
    document.head.appendChild(link);
  });
}

function createToggleSwitch(video) {
  const container = document.createElement('label');
  container.className = 'container';
  Object.assign(container.style, {
    position: 'absolute',
    top: '25px',
    right: '10px',
    left: 'auto',
    zIndex: '1000000',
    backgroundColor: 'transparent',
    pointerEvents: 'all'
  });

  const toggleSwitch = document.createElement('input');
  toggleSwitch.type = 'checkbox';
  toggleSwitch.checked = false;  // Start unchecked
  Object.assign(toggleSwitch.style, {
    pointerEvents: 'all',
    position: 'relative',
    opacity: '0',
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    zIndex: '1000001'
  });
  
  const checkmark = document.createElement('div');
  checkmark.className = 'checkmark';
  checkmark.style.pointerEvents = 'none';

  // Prevent video interaction
  container.addEventListener('mousedown', (event) => {
    event.stopPropagation();
    event.preventDefault();
  });

  // Handle checkbox changes
  // Handle checkbox changes
toggleSwitch.addEventListener('change', async (event) => {
  event.stopPropagation();
  
  if (!hasProcessedOCR && event.target.checked) {
    console.log('Processing OCR...');
    const words = await processScreenshot(video); // Pass video element
    if (words) {
      console.log('OCR completed, creating overlays...');
      const scale = window.devicePixelRatio;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      words.forEach(box => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-overlay';
        wordDiv.textContent = box.text;
        Object.assign(wordDiv.style, {
          position: 'absolute',
          top: (box.y + scrollY) + 'px',
          left: (box.x + scrollX) + 'px',
          width: box.width + 'px',
          height: box.height + 'px',
          backgroundColor: 'rgb(0, 0, 0)',
          color: 'white',
          fontSize: (box.height * 0.9) + 'px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          textAlign: 'center',
          cursor: 'text',
          fontstretch: 'expanded',
          zIndex: 999999
        });
        document.body.appendChild(wordDiv);
      });
      hasProcessedOCR = true;
    }
  }

  // Toggle visibility
  textVisible = event.target.checked;
  const wordOverlays = document.querySelectorAll('.word-overlay');
  wordOverlays.forEach(overlay => {
    overlay.style.display = textVisible ? 'flex' : 'none';
  });
});

  container.appendChild(toggleSwitch);
  container.appendChild(checkmark);
  
  return container;
}
// Initialize toggle switches for existing videos
async function initializeVideoControls() {
  await injectCSS();
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    const container = createToggleSwitch(video);
    video.parentElement.appendChild(container);

    container.querySelector('input').addEventListener('click', (event) => {
      event.stopPropagation();
    });

    container.querySelector('input').addEventListener('change', (event) => {
      textVisible = event.target.checked;
      const wordOverlays = document.querySelectorAll('.word-overlay');
      wordOverlays.forEach(overlay => {
        overlay.style.display = textVisible ? 'flex' : 'none';
      });
    });
  });
}

// Run initialization when the page loads
document.addEventListener('DOMContentLoaded', initializeVideoControls);

// Watch for dynamically added videos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const hasNewVideo = Array.from(mutation.addedNodes).some(node => 
        node.nodeName === 'VIDEO' || (node instanceof Element && node.querySelector('video'))
      );
      if (hasNewVideo) {
        initializeVideoControls();
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Handle messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Message received in content.js:', request);
  
  if (request.action === 'overlayWords') {
    await injectCSS();

    const scale = window.devicePixelRatio;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    request.boxes.forEach(box => {
      const wordDiv = document.createElement('div');
      wordDiv.className = 'word-overlay';
      wordDiv.textContent = box.text;
      Object.assign(wordDiv.style, {
        position: 'absolute',
        top: (box.y / scale + scrollY) + 'px',
        left: (box.x / scale + scrollX) + 'px',
        width: (box.width / scale) + 'px',
        height: (box.height / scale) + 'px',
        backgroundColor: 'rgb(0, 0, 0)',
        color: 'white',
        fontSize: (box.height / scale * 0.9) + 'px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        textAlign: 'center',
        cursor: 'text',
        fontstretch: 'expanded',
        zIndex: 999999
      });
      document.body.appendChild(wordDiv);
    });

    // Reinitialize video controls after adding overlays
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.parentElement.querySelector('.container')) {
        const container = createToggleSwitch(video);
        video.parentElement.appendChild(container);

        container.querySelector('input').addEventListener('click', (event) => {
          event.stopPropagation();
        });

        container.querySelector('input').addEventListener('change', (event) => {
          textVisible = event.target.checked;
          const wordOverlays = document.querySelectorAll('.word-overlay');
          wordOverlays.forEach(overlay => {
            overlay.style.display = textVisible ? 'flex' : 'none';
          });
        });
      }
    });
  } else if (request.action === 'toggleText') {
    textVisible = !textVisible;
    const wordOverlays = document.querySelectorAll('.word-overlay');
    wordOverlays.forEach(overlay => {
      overlay.style.display = textVisible ? 'flex' : 'none';
    });
  }
});