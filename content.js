// let viewportHeight = window.innerHeight; // Default value

// // Listen for messages from the webpage
// window.addEventListener('message', function(event) {
//   // We only accept messages from ourselves
//   if (event.source != window)
//     return;

//   if (event.data.type && (event.data.type == "FROM_PAGE")) {
//     if (event.data.action === "getViewportHeight") {
//       viewportHeight = event.data.viewportHeight;
//     }
//   }
// }, false);

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   if (request.action === "displayOCR") {
//     const words = request.words;

//     // Remove existing overlays if any
//     const existingOverlays = document.querySelectorAll(".word-overlay");
//     existingOverlays.forEach((overlay) => overlay.remove());

//     // Calculate the scaling factor based on the viewport height
//     const scaleFactor = viewportHeight / 945; // 928 is the height at which the text appears correctly

//     // Inject the OCR words into separate containers
//     for (const word of words) {
//       const overlay = document.createElement("div");
//       overlay.className = "word-overlay";
//       overlay.textContent = word.WordText; // Text content without adding spaces

//       // Adjust the values based on the scaleFactor
//       overlay.style.top = `${word.Top * scaleFactor}px`;
//       overlay.style.left = `${word.Left * scaleFactor}px`;
//       // overlay.style.height = `${word.Height * scaleFactor}px`;
//       // overlay.style.width = `${word.Width * scaleFactor}px`;
//       overlay.style.fontSize = `${word.Height * scaleFactor*0.9}px`;

//       overlay.style.position = "absolute";
//       overlay.style.color = "red";
//       overlay.style.backgroundColor = "black";
//       overlay.style.zIndex = "1000000";
//       overlay.style.whiteSpace = "pre-wrap"; // Preserve whitespace characters

//       document.body.appendChild(overlay);
//     }
//   }
// });

// // Inject a script into the page to get the viewport height
// const script = document.createElement('script');
// script.textContent = `
//   window.postMessage({
//     type: "FROM_PAGE",
//     action: "getViewportHeight",
//     viewportHeight: window.innerHeight
//   }, "*");
// `;
// (document.head || document.documentElement).appendChild(script);
// script.remove();
let viewportHeight = window.innerHeight;
let viewportWidth = window.innerWidth;
const referenceHeight = 945; // Reference height for scaling
const referenceWidth = 1920; // Reference width for scaling

// Listen for messages from the webpage
window.addEventListener('message', function(event) {
  // We only accept messages from ourselves
  if (event.source != window)
    return;

  if (event.data.type && (event.data.type == "FROM_PAGE")) {
    if (event.data.action === "getViewportDimensions") {
      viewportHeight = event.data.viewportHeight;
      viewportWidth = event.data.viewportWidth;
    }
  }
}, false);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "displayOCR") {
    const words = request.words;

    // Remove existing overlays if any
    const existingOverlays = document.querySelectorAll(".word-overlay");
    existingOverlays.forEach((overlay) => overlay.remove());

    // Calculate the scaling factors based on the viewport dimensions
    const heightScaleFactor = viewportHeight / referenceHeight;
    const widthScaleFactor = viewportWidth / referenceWidth;

    // Inject the OCR words into separate containers
    for (const word of words) {
      const overlay = document.createElement("div");
      overlay.className = "word-overlay";
      overlay.textContent = word.WordText; // Text content without adding spaces

      // Adjust the values based on the scale factors
      overlay.style.top = `${word.Top * heightScaleFactor}px`;
      overlay.style.left = `${word.Left * widthScaleFactor}px`;
      overlay.style.fontSize = `${word.Height * heightScaleFactor * 0.9}px`;

      overlay.style.position = "absolute";
      overlay.style.color = "red";
      overlay.style.backgroundColor = "black";
      overlay.style.zIndex = "1000000";
      overlay.style.whiteSpace = "pre-wrap"; // Preserve whitespace characters

      document.body.appendChild(overlay);
    }
  }
});

// Inject a script into the page to get the viewport dimensions
const script = document.createElement('script');
script.textContent = `
  window.postMessage({
    type: "FROM_PAGE",
    action: "getViewportDimensions",
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth
  }, "*");
`;
(document.head || document.documentElement).appendChild(script);
script.remove();
