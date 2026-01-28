if (typeof GLightbox === "function") {
  try {
    GLightbox({
      selector: ".glightbox",
      openEffect: "fade",
      closeEffect: "fade",
      slideEffect: "slide",
      loop: true,
      touchNavigation: true,
      descPosition: "bottom"
    });
  } catch (e) {
    console.warn("GLightbox init failed:", e);
  }
} else {
  console.warn("GLightbox not found. Skipping lightbox init.");
}
const links = document.querySelectorAll(".project-images a");
if (links.length) {
  for (const a of links) {
    a.addEventListener("mouseenter", () => {
      const href = a.getAttribute("href");
      if (!href) return;
      const big = new Image();
      big.decoding = "async";
      big.src = href;
    }, { once: true }); 
}
}
