document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const viewPanels = document.querySelectorAll(".view-panel");

    // Dynamic Panel Tab Switcher Configuration
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            // 1. Remove active state class toggles from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));
            
            // 2. Hide all main viewport sections
            viewPanels.forEach(panel => panel.classList.remove("active"));

            // 3. Mark clicked button as target active state
            button.classList.add("active");

            // 4. Look up target ID matching the data-target key and display it
            const targetPanelId = button.getAttribute("data-target");
            const targetPanel = document.getElementById(targetPanelId);
            
            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });
});
