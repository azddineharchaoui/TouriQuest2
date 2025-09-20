# TouriQuest Design System Guidelines

## 🎨 Design Philosophy

TouriQuest embraces a modern, sustainable, and user-centric design philosophy that prioritizes:

- **Accessibility First**: WCAG 2.1 AA compliance for all components
- **Sustainable Travel**: Eco-friendly messaging and green technology integration
- **Professional Aesthetics**: Clean, modern interfaces that inspire trust
- **Mobile-First Responsive**: Optimized for all device types and screen sizes
- **Performance**: Fast, lightweight components with minimal loading times

## 🎯 Brand Identity

### Core Values
- **Sustainability**: Environmental responsibility in travel
- **Discovery**: Empowering exploration and cultural connection
- **Trust**: Reliable, secure, and transparent platform
- **Innovation**: Cutting-edge technology for enhanced experiences
- **Community**: Connecting travelers with local communities

### Visual Language
- **Modern Minimalism**: Clean interfaces with purposeful white space
- **Nature-Inspired**: Colors and imagery reflecting natural environments
- **Professional Trust**: Business-grade reliability with consumer-friendly warmth
- **Global Appeal**: Culturally sensitive and internationally accessible

## 🎨 Color System

### Primary Palette
```css
/* Teal - Trust, reliability, professional confidence */
--primary-teal: #00B4A6;     /* Main brand color */
--primary-dark: #008B7F;     /* Hover states, emphasis */
--primary-light: #33C4B8;    /* Accents, highlights */
--primary-tint: #E6F7F6;     /* Backgrounds, subtle areas */
```

### Secondary Palette
```css
/* Orange - Energy, warmth, call-to-action */
--secondary-orange: #FF7A59;  /* CTAs, important actions */
--secondary-dark: #E85D3D;    /* Hover states */
--secondary-light: #FF9B80;   /* Gentle highlights */
--secondary-tint: #FFF0ED;    /* Light backgrounds */
```

### Neutral Palette
```css
/* Navy - Primary text, headings, authority */
--navy: #1B365D;             /* Primary text, headers */
--dark-gray: #495057;        /* Secondary text */
--medium-gray: #6C757D;      /* Tertiary text, icons */
--light-gray: #ADB5BD;       /* Borders, dividers */
--pale-gray: #E9ECEF;        /* Card backgrounds */
--off-white: #F8F9FA;        /* Page backgrounds */
--pure-white: #FFFFFF;       /* Content backgrounds */
```

### Semantic Colors
```css
--success: #2D7D32;          /* Confirmations, eco-friendly */
--warning: #FFA726;          /* Alerts, pending states */
--error: #E53E3E;            /* Errors, urgent actions */
--info: #1976D2;             /* Information, links */
```

### Usage Rules
- **Primary Teal**: Use for main CTAs, navigation active states, and brand elements
- **Secondary Orange**: Reserve for high-impact actions like "Book Now", "Reserve", "Confirm"
- **Navy**: Always use for primary headings and important text content
- **Neutrals**: Follow the hierarchy - darker for more important content
- **Semantic Colors**: Only use for their intended meanings (success = positive feedback, etc.)

## 📝 Typography

### Font Families
- **Primary**: Inter (headings, UI elements) - Modern, highly legible
- **Secondary**: Source Sans Pro (body text, descriptions) - Readable, friendly
- **Monospace**: Fira Code (code, data display) - Technical content

### Scale & Hierarchy
```css
/* Display Headings */
--text-6xl: 3.75rem;   /* 60px - Hero headings, marketing */
--text-5xl: 3rem;      /* 48px - Page hero titles */
--text-4xl: 2.25rem;   /* 36px - Section headings */

/* Content Headings */
--text-3xl: 1.875rem;  /* 30px - Card titles, important headings */
--text-2xl: 1.5rem;    /* 24px - Subsection headings */
--text-xl: 1.25rem;    /* 20px - Card subtitles, large text */

/* Body Text */
--text-lg: 1.125rem;   /* 18px - Large body, emphasis */
--text-base: 1rem;     /* 16px - Standard body text */
--text-sm: 0.875rem;   /* 14px - Small text, metadata */
--text-xs: 0.75rem;    /* 12px - Captions, labels */
```

### Font Weights
```css
--font-light: 300;     /* Rarely used, special cases */
--font-regular: 400;   /* Body text, descriptions */
--font-medium: 500;    /* Emphasized text, labels */
--font-semibold: 600;  /* Subheadings, important UI text */
--font-bold: 700;      /* Main headings, strong emphasis */
```

### Line Heights
```css
--leading-tight: 1.25;    /* Headings, compact text */
--leading-normal: 1.5;    /* UI elements, labels */
--leading-relaxed: 1.75;  /* Body text, reading content */
```

### Typography Rules
- **Never use font-size classes** unless explicitly overriding the design system
- **Headings**: Always use semantic HTML (h1, h2, etc.) with proper hierarchy
- **Body Text**: Default line-height should promote readability
- **International**: Ensure fonts support international character sets
- **Accessibility**: Minimum 16px for body text, high contrast ratios

## 📐 Spacing System

### Base Unit: 8px
All spacing should use multiples of 8px for visual consistency:

```css
--space-1: 0.25rem;   /* 4px - Tight spacing */
--space-2: 0.5rem;    /* 8px - Base unit */
--space-3: 0.75rem;   /* 12px - Small gaps */
--space-4: 1rem;      /* 16px - Standard spacing */
--space-5: 1.25rem;   /* 20px - Medium spacing */
--space-6: 1.5rem;    /* 24px - Large spacing */
--space-8: 2rem;      /* 32px - Section spacing */
--space-10: 2.5rem;   /* 40px - Large sections */
--space-12: 3rem;     /* 48px - Major sections */
--space-16: 4rem;     /* 64px - Page sections */
--space-20: 5rem;     /* 80px - Large page sections */
--space-24: 6rem;     /* 96px - Hero sections */
--space-32: 8rem;     /* 128px - Major page divisions */
```

### Spacing Rules
- **Component Padding**: Use --space-4 (16px) as default internal padding
- **Section Spacing**: Use --space-16 (64px) or larger for major page sections
- **Card Spacing**: Use --space-6 (24px) for card internal spacing
- **Element Gaps**: Use --space-3 (12px) for small element gaps

## 🔘 Border Radius

### Radius Scale
```css
--radius-none: 0;           /* Sharp edges, data tables */
--radius-sm: 0.25rem;       /* 4px - Small elements, badges */
--radius-base: 0.5rem;      /* 8px - Standard UI elements */
--radius-md: 0.75rem;       /* 12px - Cards, larger elements */
--radius-lg: 1rem;          /* 16px - Prominent cards */
--radius-xl: 1.5rem;        /* 24px - Hero elements */
--radius-full: 50%;         /* Circular elements, avatars */
```

### Usage Rules
- **Buttons**: Use --radius-base (8px) for consistency
- **Cards**: Use --radius-md (12px) for subtle modern appearance
- **Input Fields**: Use --radius-base (8px) to match buttons
- **Images**: Use --radius-md (12px) unless specifically circular
- **Modals**: Use --radius-lg (16px) for prominence

## 🌟 Shadows & Elevation

### Shadow System
```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
--shadow-md: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
--shadow-lg: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10);
--shadow-xl: 0 20px 40px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.12);
```

### Elevation Rules
- **Cards**: Start with --shadow-sm, use --shadow-md on hover
- **Modals**: Use --shadow-xl for clear separation from background
- **Dropdowns**: Use --shadow-lg for proper visibility
- **Buttons**: Use --shadow-sm for subtle depth, avoid on ghost buttons

## 🎛️ Component Guidelines

### Buttons

#### Primary Buttons
```tsx
// Main actions, most important CTAs
<Button variant="default" size="lg">
  Book Now
</Button>
```
- **Usage**: One primary button per section/page
- **Colors**: Teal background (#00B4A6) with white text
- **Hover**: Darker teal (#008B7F) with subtle scale (0.98)
- **Sizes**: Small (32px), Default (40px), Large (48px)

#### Secondary Buttons
```tsx
// Alternative actions, supporting CTAs
<Button variant="secondary" size="default">
  Learn More
</Button>
```
- **Usage**: Can accompany primary buttons
- **Colors**: Orange background (#FF7A59) with white text
- **Best For**: Special actions, promotions, urgent CTAs

#### Outline Buttons
```tsx
// Tertiary actions, form cancellations
<Button variant="outline" size="default">
  Cancel
</Button>
```
- **Usage**: Secondary actions that need less emphasis
- **Style**: Teal border with teal text, white background
- **Hover**: Light teal background (#E6F7F6)

#### Ghost Buttons
```tsx
// Minimal actions, navigation elements
<Button variant="ghost" size="sm">
  Skip
</Button>
```
- **Usage**: Low-priority actions, navigation
- **Style**: Transparent background, teal text
- **Hover**: Light teal background

### Cards

#### Property Cards
```tsx
<Card className="overflow-hidden hover:shadow-lg transition-shadow">
  <div className="relative">
    {/* 4:3 aspect ratio image */}
    <img className="w-full h-48 object-cover" />
    <Badge className="absolute top-3 left-3">
      <Star className="w-3 h-3 mr-1" />
      4.8
    </Badge>
  </div>
  <div className="p-5">
    <h3 className="font-semibold mb-2">Property Name</h3>
    <p className="text-medium-gray">From $120/night</p>
  </div>
</Card>
```

#### POI Cards
```tsx
<Card className="group cursor-pointer hover:-translate-y-1 transition-all">
  <div className="relative">
    <img className="w-full h-40 object-cover" />
    <div className="absolute top-3 right-3">
      <Badge variant="secondary">Featured</Badge>
    </div>
  </div>
  <div className="p-4">
    <h4 className="font-semibold mb-1">POI Name</h4>
    <p className="text-sm text-medium-gray">2.4 km away</p>
  </div>
</Card>
```

### Forms & Inputs

#### Text Inputs
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-navy">
    Email Address
  </label>
  <Input 
    type="email"
    placeholder="Enter your email"
    className="w-full"
  />
</div>
```
- **Background**: Off-white (#F8F9FA) with light border
- **Focus**: Teal border with subtle ring
- **Height**: 40px minimum for touch accessibility
- **Placeholder**: Medium gray text (#6C757D)

#### Search Inputs
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-gray" />
  <Input 
    placeholder="Search destinations..."
    className="pl-10"
  />
</div>
```

### Navigation

#### Header Navigation
- **Logo**: Left-aligned with compass icon
- **Main Nav**: Center-aligned on desktop
- **User Actions**: Right-aligned (search, notifications, user menu)
- **Mobile**: Hamburger menu with slide-out panel

#### Bottom Navigation (Mobile)
- **Maximum 5 tabs**: Stays, Discover, Experiences, Trips, Profile
- **Active State**: Teal color with icon + label
- **Touch Target**: Minimum 44px height
- **Safe Area**: Respect device safe areas

### Modals & Overlays

#### Modal Behavior
- **Background**: Semi-transparent dark overlay (rgba(0,0,0,0.5))
- **Focus Trap**: Keep focus within modal
- **Escape Key**: Close modal on ESC
- **Click Outside**: Close on background click
- **Scrolling**: Lock body scroll when modal open

#### Modal Sizes
- **Small**: 400px max width (confirmations)
- **Medium**: 600px max width (forms)
- **Large**: 800px max width (complex content)
- **Full Screen**: Mobile/tablet full takeover

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
/* Mobile: 320px - 767px (default) */
/* Tablet: 768px - 1023px */
@media (min-width: 768px) { }

/* Desktop: 1024px - 1439px */
@media (min-width: 1024px) { }

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) { }
```

### Component Responsiveness
- **Cards**: Single column on mobile, grid on larger screens
- **Navigation**: Hamburger menu on mobile, horizontal on desktop
- **Forms**: Stack inputs on mobile, row layout on desktop
- **Typography**: Scale headings down on smaller screens
- **Spacing**: Reduce padding/margins on mobile

### Touch Considerations
- **Minimum Touch Target**: 44px x 44px
- **Thumb Zones**: Place important actions in easily reachable areas
- **Swipe Gestures**: Support where appropriate (carousels, sheets)
- **Hover States**: Hide on touch devices, show on mouse devices

## ♿ Accessibility Guidelines

### Color & Contrast
- **Text Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Interactive Elements**: Minimum 3:1 contrast for borders/icons
- **Color Independence**: Never rely solely on color to convey information
- **Dark Mode**: Provide alternative color schemes

### Keyboard Navigation
- **Tab Order**: Logical, predictable focus flow
- **Focus Indicators**: Clear, visible focus states
- **Skip Links**: Allow users to skip repetitive navigation
- **Keyboard Shortcuts**: Provide for power users

### Screen Readers
- **Semantic HTML**: Use proper heading hierarchy (h1, h2, h3...)
- **ARIA Labels**: Provide context for complex interactions
- **Alt Text**: Descriptive text for all images
- **Live Regions**: Announce dynamic content changes

### Forms
- **Labels**: Always associate labels with inputs
- **Error Messages**: Clear, actionable error descriptions
- **Required Fields**: Clearly mark required inputs
- **Validation**: Provide real-time, helpful feedback

## 🚀 Performance Guidelines

### Image Optimization
- **WebP Format**: Use for modern browsers with fallbacks
- **Responsive Images**: Serve appropriate sizes for device
- **Lazy Loading**: Load images as they enter viewport
- **Alt Text**: Always provide for accessibility

### Loading States
- **Skeleton Screens**: Show content structure while loading
- **Spinners**: Use sparingly, with meaningful text
- **Progressive Loading**: Load critical content first
- **Error States**: Provide clear error messages and recovery options

### Animation & Interactions
- **60fps Target**: Ensure smooth animations
- **Reduced Motion**: Respect user preferences
- **GPU Acceleration**: Use transform and opacity for animations
- **Duration**: Keep animations under 500ms for UI feedback

## 🌍 Internationalization

### Text & Typography
- **Text Expansion**: Design for 30-50% text expansion
- **Right-to-Left**: Support RTL languages
- **Font Loading**: Ensure international character support
- **Line Height**: Account for accented characters

### Cultural Considerations
- **Color Meanings**: Be aware of cultural color associations
- **Imagery**: Use culturally diverse and appropriate images
- **Date/Time**: Format according to user locale
- **Currency**: Display in user's preferred currency

## 🔧 Development Guidelines

### CSS Best Practices
- **Design Tokens**: Always use CSS custom properties
- **Mobile First**: Write CSS from smallest to largest screens
- **Specificity**: Keep CSS specificity low and manageable
- **BEM Methodology**: Use consistent class naming when needed

### Component Architecture
- **Single Responsibility**: Each component should have one clear purpose
- **Composition**: Prefer composition over inheritance
- **Prop Naming**: Use clear, descriptive prop names
- **Default Props**: Provide sensible defaults

### Code Organization
- **File Structure**: Group related components together
- **Import Order**: External libraries, internal components, relative imports
- **TypeScript**: Use strict typing for better developer experience
- **Documentation**: Include JSDoc comments for complex components

## 📋 Component Checklist

Before considering a component complete, ensure:

### Functionality
- [ ] Component works in all supported browsers
- [ ] Responsive design works on all screen sizes
- [ ] All interactive states are implemented (hover, focus, active, disabled)
- [ ] Error states and loading states are handled
- [ ] Component follows accessibility guidelines

### Design
- [ ] Uses design tokens from the system
- [ ] Follows spacing and typography hierarchy
- [ ] Matches the visual design specifications
- [ ] Consistent with similar components in the system
- [ ] Supports both light and dark themes (if applicable)

### Code Quality
- [ ] TypeScript types are properly defined
- [ ] Component is properly documented
- [ ] No console errors or warnings
- [ ] Performance optimized (memoization where appropriate)
- [ ] Follows project coding standards

### Testing
- [ ] Unit tests cover main functionality
- [ ] Accessibility testing passed
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed
- [ ] Performance testing shows acceptable metrics

## 🎯 Next Development Priorities

### Immediate (Current Session)
1. **Social Feed System**: Travel sharing, user-generated content
2. **Travel Matching**: Connect travelers with similar interests
3. **Community Features**: Groups, forums, local meetups
4. **Advanced Itinerary Planner**: AI-optimized trip planning

### Short Term (Next 2-3 Sessions)
1. **Real-time Chat System**: Traveler communication
2. **Booking Integration**: Payment processing, confirmation flows
3. **Review & Rating System**: User feedback and reputation
4. **Notification System**: Real-time updates and alerts

### Medium Term (Next 5+ Sessions)
1. **Mobile App Companion**: Native mobile experience
2. **AR/VR Enhancement**: Immersive destination previews
3. **AI Travel Concierge**: Advanced personal assistant
4. **Sustainability Tracking**: Carbon footprint monitoring

This design system ensures TouriQuest maintains a professional, accessible, and cohesive experience across all platforms while supporting sustainable travel practices and global accessibility.