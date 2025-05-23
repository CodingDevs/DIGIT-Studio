
# DIGIT Studio Frontend

A modern, component-based UI system for DIGIT Studio built on React and Tailwind CSS using Digit UI Framework.


# DIGIT

DIGIT eGovernance Platform Services

DIGIT (Digital Infrastructure for Governance, Impact & Transformation) is India's largest platform for governance services. Visit https://core.digit.org/ for more details.

DIGIT platform is microservices based API platform enabling quick rebundling of services as per specific needs. This is a repo that lays down the core platform on top of which other mission services depend.


## Overview

DIGIT Studio Frontend provides a comprehensive UI framework for building administrative interfaces for the DIGIT platform. It follows a modular architecture with reusable components, consistent styling, and clear separation of concerns.

## Architecture

The frontend is organized into several key packages:

### UI Components

A library of React components following atomic design principles:
- **Atoms**: Fundamental building blocks like buttons, inputs, and cards
- **Molecules**: Compound components composed of multiple atoms
- **Organisms**: Complex components that form functional sections of the UI

### CSS Package

Provides styling built on Tailwind CSS with:
- Base styles and normalization
- Component-specific styling
- Utility classes

### PublicServices Module

A sample module demonstrating how to build feature modules using the core framework.


## Getting Started

### Prerequisites

- Node.js 14 or higher
- Yarn package manager


### Installation

Clone the project

```bash
  git clone https://github.com/egovernments/DIGIT-Studio.git
```

Go to the Sub directory to run UI
```bash
    cd into frontend/web/micro-ui-internals
```

Install dependencies

```bash
  yarn install
```

Add .env file
```bash
    frontend/web/micro-ui-internals/example/.env
```

Start the server

```bash
  yarn start
```


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`REACT_APP_PROXY_API` ::  `{{server url}}`

`REACT_APP_GLOBAL`  ::  `{{server url}}`

`REACT_APP_PROXY_ASSETS`  ::  `{{server url}}`

`REACT_APP_USER_TYPE`  ::  `{{EMPLOYEE||CITIZEN}}`

`SKIP_PREFLIGHT_CHECK` :: `true`

[sample .env file](https://github.com/egovernments/Digit-Frontend/blob/workbench/frontend/micro-ui/web/micro-ui-internals/example/.env-unifieddev)

## Tech Stack

**Libraries:** 

[React](https://react.dev/)

[React Hook Form](https://www.react-hook-form.com/)

[React Query](https://tanstack.com/query/v3/)

[Tailwind CSS](https://tailwindcss.com/)

[Webpack](https://webpack.js.org/)

## License

[MIT](https://choosealicense.com/licenses/mit/)


## Author

- [@jagankumar-egov](https://www.github.com/jagankumar-egov)


## Documentation

[Documentation](https://https://core.digit.org/guides/developer-guide/ui-developer-guide/digit-ui)


## Support

For support, add the issues in https://github.com/egovernments/DIGIT-core/issues.


## Modules

    1. Core (From NPM)
    2. Workbench (From NPM)
    3. HRMS (From NPM)
    4. Public Service

## Creating a New Module
To create a new feature module:

### Create a new directory in packages/modules/
- Set up the package structure following the PublicServices example
- Implement your module-specific components, pages, and services
- Register your module in the main application
- See the PublicServices module README for detailed instructions.

### Best Practices
- Use functional components with hooks
- Follow atomic design principles for UI components
- Implement unit tests for components and business logic
- Use the existing theming system for consistent styling
- Leverage the built-in form handling and data fetching utilities


## Starting with Digit-UI App (Impelmentation Teams) - MICRO-UI


Go to the Sub directory to run UI

```bash
    cd into frontend/web
```
    
```bash
  yarn install
```

Add .env file
```bash
    frontend/web/.env
```

Start the server

```bash
  yarn start
```


![Logo](https://s3.ap-south-1.amazonaws.com/works-dev-asset/mseva-white-logo.png)
