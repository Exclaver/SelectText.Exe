document.addEventListener("DOMContentLoaded", function () {
  const screenshotButton = document.getElementById("screenshotButton");
  const toggleButton = document.getElementById("toggleButton");

  screenshotButton.addEventListener("click", function () {
    chrome.runtime.sendMessage(
      { action: "takeScreenshot" },
      function (response) {
        if (response && response.screenshot) {
          const screenshotImage = document.getElementById("screenshotImage");
          screenshotImage.src = response.screenshot;

          const base64Image = response.screenshot.split(",")[1];
          const apiKey = "AIzaSyCtO1oprbK6g-kK-LHR2HxnOhvgeS7Rilo"; // Replace with your actual API key
          const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
          const requestBody = {
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: "TEXT_DETECTION",
                  },
                ],
              },
            ],
          };

          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          })
            .then((response) => response.json())
            .then((responseData) => {
              if (responseData.error) {
                console.log(`OCR processing error: ${responseData.error.message}`);
              } else {
                const words = responseData.responses[0].textAnnotations.slice(1).map((annotation) => ({
                  text: annotation.description,
                  y: annotation.boundingPoly.vertices[0].y,
                  x: annotation.boundingPoly.vertices[0].x,
                  height: annotation.boundingPoly.vertices[2].y - annotation.boundingPoly.vertices[0].y,
                  width: annotation.boundingPoly.vertices[2].x - annotation.boundingPoly.vertices[0].x,
                }));
                console.log(words);

                chrome.tabs.query(
                  { active: true, currentWindow: true },
                  function (tabs) {
                    chrome.scripting.executeScript(
                      {
                        target: { tabId: tabs[0].id },
                        files: ["content.js"],
                      },
                      () => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                          action: "overlayWords",
                          boxes: words,
                        });
                      }
                    );
                  }
                );
              }
            })
            .catch((error) => {
              console.error(error);
            });
        }
      }
    );
  });

  toggleButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleText" });
    });
  });
});