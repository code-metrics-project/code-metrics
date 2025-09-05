# CodeMetrics Promo Site Documentation

## Overview

The CodeMetrics Promo Site is a modern, high-performance website built using [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/). It's based on the [AstroWind](https://astrowind.vercel.app/) theme and provides a production-ready solution for showcasing CodeMetrics.

![CodeMetrics Promo Site Screenshot](../img/promosite.png)

## Key Features

- 🚀 **High Performance**: Optimized for PageSpeed Insights with excellent scores
- 🎨 **Modern Design**: Built with Tailwind CSS supporting Dark mode and RTL
- 📱 **Responsive**: Fully responsive design that works on all devices
- 🔍 **SEO Friendly**: Built-in SEO optimizations and Open Graph tags
- 🖼️ **Image Optimization**: Using Astro Assets and Unpic for Universal image CDN
- 📊 **Analytics Ready**: Built-in support for Google Analytics
- 🗺️ **Sitemap Generation**: Automatic sitemap generation based on routes

## Project Structure

```
/promosite
├── public/              # Static assets
├── src/
│   ├── assets/         # Images, styles, and other assets
│   ├── components/     # Reusable UI components
│   ├── content/        # Content files (blog posts, etc.)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Route pages
│   ├── utils/          # Utility functions
│   ├── config.yaml     # Site configuration
│   └── navigation.js   # Navigation configuration
├── astro.config.ts     # Astro configuration
└── tailwind.config.js  # Tailwind CSS configuration
```

## Getting Started

### Prerequisites

- Node.js version: ^18.17.1 || ^20.3.0 || >= 21.0.0
- npm (Node Package Manager)

### Installation

1. Clone the repository
2. Navigate to the promosite directory
3. Install dependencies:

```bash
npm install
```

### Development

To start the development server:

```bash
npm run dev
```

This will start the local development server at `localhost:4321`

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Available Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start development server          |
| `npm run build`   | Build for production              |
| `npm run preview` | Preview production build          |
| `npm run check`   | Check for errors                  |
| `npm run fix`     | Fix linting and formatting issues |

## Configuration

The main configuration file is located at `src/config.yaml`. Key configuration options include:

- Site metadata and SEO settings
- Blog configuration (if enabled)
- Analytics settings
- UI theme preferences
- Internationalization settings

## Deployment

The site is configured for static deployment and can be hosted on any static hosting service. The recommended deployment method is through GitHub Pages.

## Dependencies

### Core Dependencies

- Astro v5.8.2
- Tailwind CSS v3.4.1
- Various Astro integrations for RSS, sitemap, and analytics

### Development Dependencies

- TypeScript
- ESLint
- Prettier
- Various Astro plugins and tools

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Based on the [AstroWind](https://github.com/onwidget/astrowind) theme
- Created by [onWidget](https://onwidget.com)
- Maintained by the CodeMetrics team
