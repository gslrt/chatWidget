// /frontend/src/WebsiteAnalyticsClientSide.js


// Function to track time spent on a page
const trackTimeOnPage = () => {
  console.log("Track Time on Page function executed");
  const startTime = new Date().getTime();
  window.addEventListener('beforeunload', () => {
    const endTime = new Date().getTime();
    const timeSpent = endTime - startTime;
    console.log(`Time Spent on Page: ${timeSpent}`);
    // Send this data to the server via API call to /analytics/trackTimeOnPage
  });
};

// Function to track scroll behavior
const trackScrollBehavior = () => {
  console.log("Track Scroll Behavior function executed");
  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    console.log(`Scroll Position: ${scrollPosition}`);
    // Send this data to the server via API call to another endpoint
  });
};

// Call the tracking functions
trackTimeOnPage();
trackScrollBehavior();
