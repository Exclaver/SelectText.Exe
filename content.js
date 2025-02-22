let textVisible = true;
let hasProcessedOCR = false;
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionOverlay = null;


function initializeTextSelection() {
  const selectionStyles = `
    .selection-overlay {
      position: fixed;
      background: rgba(66, 135, 245, 0.2);
      border: 1px solid #4287f5;
      pointer-events: none;
      z-index: 999998;
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = selectionStyles;
  document.head.appendChild(style);

  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && textVisible && hasProcessedOCR) { // Left click and overlay is visible
      isSelecting = true;
      selectionStart = { x: e.clientX, y: e.clientY };
      
      // Create selection overlay
      selectionOverlay = document.createElement('div');
      selectionOverlay.className = 'selection-overlay';
      document.body.appendChild(selectionOverlay);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isSelecting && selectionOverlay) {
      const currentPos = { x: e.clientX, y: e.clientY };
      
      // Calculate selection rectangle
      const left = Math.min(selectionStart.x, currentPos.x);
      const top = Math.min(selectionStart.y, currentPos.y);
      const width = Math.abs(currentPos.x - selectionStart.x);
      const height = Math.abs(currentPos.y - selectionStart.y);
      
      // Update selection overlay
      Object.assign(selectionOverlay.style, {
        left: left + 'px',
        top: top + 'px',
        width: width + 'px',
        height: height + 'px'
      });
      const selectionBounds = {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height
      };
  
      const wordOverlays = document.querySelectorAll('.word-overlay');
      wordOverlays.forEach(overlay => {
        const rect = overlay.getBoundingClientRect();
        
        // Check if overlay intersects with selection
        if (rect.left < selectionBounds.right &&
            rect.right > selectionBounds.left &&
            rect.top < selectionBounds.bottom &&
            rect.bottom > selectionBounds.top) {
          overlay.style.backgroundColor = '#4287f5'; // Highlight color
          overlay.style.color = 'black'; // Text color for better contrast
        } else {
          overlay.style.backgroundColor = 'rgb(0, 0, 0)'; // Reset to original color
          overlay.style.color = 'white'; // Reset to original text color
        }
      });
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isSelecting && selectionOverlay) {
      isSelecting = false;
      
      // Get selection bounds
      const selectionBounds = {
        left: parseInt(selectionOverlay.style.left),
        top: parseInt(selectionOverlay.style.top),
        right: parseInt(selectionOverlay.style.left) + parseInt(selectionOverlay.style.width),
        bottom: parseInt(selectionOverlay.style.top) + parseInt(selectionOverlay.style.height)
      };

      // Find all word overlays within selection
      const selectedText = [];
      const wordOverlays = document.querySelectorAll('.word-overlay');
      wordOverlays.forEach(overlay => {
        const rect = overlay.getBoundingClientRect();
        
        // Check if overlay intersects with selection
        if (rect.left < selectionBounds.right &&
            rect.right > selectionBounds.left &&
            rect.top < selectionBounds.bottom &&
            rect.bottom > selectionBounds.top) {
          selectedText.push(overlay.getAttribute('data-text'));
        }
        //reset overlay colours
        overlay.style.backgroundColor = 'rgb(0, 0, 0)';
        overlay.style.color = 'white';
      });

      // Copy selected text to clipboard
      if (selectedText.length > 0) {
        const textToCopy = selectedText.join(' ');
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Show feedback (optional)
          const feedback = document.createElement('div');
Object.assign(feedback.style, {
  position: 'fixed',
  left: '50%',
  top: selectionBounds.bottom + 10 + 'px',
  transform: 'translateX(-50%)',
  background: 'black',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '50px',
  zIndex: '1000000',
  opacity: '0',
  transition: 'all 0.7s',
  boxShadow: `
    -10px -10px 20px 0px #5B51D8,
    0 -10px 20px 0px #833AB4,
    10px -10px 20px 0px #E1306C,
    10px 0 20px 0px #FD1D1D,
    10px 10px 20px 0px #F77737,
    0 10px 20px 0px #FCAF45,
    -10px 10px 20px 0px #FFDC80
  `,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontSize: '14px',
  fontWeight: '500',
  textAlign: 'center'
          });
          feedback.textContent = 'Text copied!';
          document.body.appendChild(feedback);
          
          // Animate feedback
          requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            setTimeout(() => {
              feedback.style.opacity = '0';
              setTimeout(() => feedback.remove(), 200);
            }, 1500);
          });
        });
      }

      // Remove selection overlay
      selectionOverlay.remove();
      selectionOverlay = null;
    }
  });
}
// Add the processScreenshot function that was missing
function processScreenshot(video) {
  return new Promise((resolve) => {
    // Get video dimensions and position
    const videoRect = video.getBoundingClientRect();
    const scale = window.devicePixelRatio;

    // Create a canvas and draw the video directly
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video dimensions
    canvas.width = videoRect.width * scale;
    canvas.height = videoRect.height * scale;
    
    // Draw video directly to canvas
    ctx.drawImage(video, 
      0, 0,                           // Source x,y (start from beginning of video)
      video.videoWidth, video.videoHeight,  // Source width,height (full video dimensions)
      0, 0,                           // Destination x,y
      canvas.width, canvas.height     // Destination width,height
    );

    // Get image data directly from canvas
    const base64Image = canvas.toDataURL('image/jpeg').split(",")[1];
    
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
        // Sort words by vertical position first, then horizontal
        const words = responseData.responses[0].textAnnotations.slice(1)
          .map(annotation => ({
            text: annotation.description,
            y: annotation.boundingPoly.vertices[0].y,
            x: annotation.boundingPoly.vertices[0].x,
            height: annotation.boundingPoly.vertices[2].y - annotation.boundingPoly.vertices[0].y,
            width: annotation.boundingPoly.vertices[2].x - annotation.boundingPoly.vertices[0].x,
            right: annotation.boundingPoly.vertices[1].x // Add right edge position
          }))
          .sort((a, b) => {
            // Group words into lines based on vertical position (within 10px)
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff < 10) {
              return a.x - b.x; // Same line, sort left to right
            }
            return a.y - b.y; // Different lines, sort top to bottom
          });

        // Add spaces between words based on horizontal distance
        const processedWords = words.map((word, index) => {
          const nextWord = words[index + 1];
          if (nextWord) {
            // If words are on the same line and gap is significant
            if (Math.abs(word.y - nextWord.y) < 10 && 
                (nextWord.x - word.right) > word.height * 0.3) { // Use height as reference for space width
              word.text += ' '; // Add space
            }
            // If next word is on new line
            if (Math.abs(word.y - nextWord.y) >= 10) {
              word.text += '\n'; // Add newline
            }
          }
          return {
            text: word.text,
            y: word.y / scale + videoRect.top,
            x: word.x / scale + videoRect.left,
            height: word.height / scale,
            width: word.width / scale
          };
        });

        resolve(processedWords);
      }
    })
    .catch(error => {
      console.error('OCR Error:', error);
      resolve(null);
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
    top: '35px',
    right: '10px',
    left: 'auto',
    zIndex: '1000000',
    backgroundColor: 'transparent',
    pointerEvents: 'all'
  });

  const toggleSwitch = document.createElement('input');
  toggleSwitch.type = 'checkbox';
  toggleSwitch.checked = false;
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

  // Prevent all mouse events on container except single clicks
  container.addEventListener('mousedown', (event) => {
    event.stopPropagation();
    event.preventDefault();
  });

  container.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    event.preventDefault();
  });

  // Prevent all mouse events on toggle switch except change
  toggleSwitch.addEventListener('mousedown', (event) => {
    event.stopPropagation();
    event.preventDefault();
  });

  toggleSwitch.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    event.preventDefault();
  });

  // Handle checkbox changes
  toggleSwitch.addEventListener('change', async (event) => {
    event.stopPropagation();
    
    if (!hasProcessedOCR && event.target.checked) {
      console.log('Processing OCR...');
      const words = await processScreenshot(video);
      if (words) {
        console.log('OCR completed, creating overlays...');
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        words.forEach(box => {
          const wordDiv = document.createElement('div');
          wordDiv.className = 'word-overlay';
          wordDiv.textContent = box.text;
          wordDiv.setAttribute('data-text', box.text);
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
        initializeTextSelection();
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