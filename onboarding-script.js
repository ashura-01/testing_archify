document.addEventListener("DOMContentLoaded", function() {
  document.addEventListener("click", function(e) {
    if (e.target.hasAttribute("data-scroll-to")) {
      e.preventDefault();
      const targetClass = e.target.getAttribute("data-scroll-to");
      const targetElement = document.querySelector("." + targetClass);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
});
