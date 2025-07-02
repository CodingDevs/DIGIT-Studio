const LandingPageConfig = [
    {
      type: "Header",
      text: "Create New Service Group",
    },
    {
      type: "SubHeader",
      text: "Build license and permit service groups for your citizens",
    },
    {
      type: "SectionHeader",
      text: "My Service groups",
    },
    {
      type: "ToggleGroup",
      name: "serviceGroupToggle",
      options: [
        { code: "Published", name: "Published" },
        { code: "Drafts", name: "Drafts" },
      ],
      default: "Published",
    },
    {
        type: "CardGroup",
        dataKey:"templates",
        toggleData : true
    },
    {
        type: "SectionHeader",
        text: "My Template groups",
      },
    {
        type: "CardGroup",
        dataKey:"templates"
    }
  ];
  
  export default LandingPageConfig;
  