# Synthetic Transcendence Design System - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Import Components
```tsx
// Layout
import { Grid, Flex, Stack, Container } from '@/components/layout';

// UI
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Badge,
  Modal,
  Tabs,
  Dropdown,
  Toast,
  Spinner,
  Alert,
} from '@/components/ui';
```

### 2. Create a Page
```tsx
'use client';

import { Grid, Flex, Stack } from '@/components/layout';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function MyPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <Flex justify="between" align="center">
        <h1>My Page</h1>
        <Button variant="primary">Action</Button>
      </Flex>

      {/* Content Grid */}
      <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
        {items.map((item) => (
          <Card key={item.id} glow>
            <CardHeader>
              <h3>{item.title}</h3>
            </CardHeader>
            <CardBody>
              {item.content}
            </CardBody>
          </Card>
        ))}
      </Grid>
    </motion.div>
  );
}
```

---

## 🎨 Color Quick Reference

| Color | Usage | CSS Variable |
|-------|-------|--------------|
| **Primary** (#d0bcff) | Main CTAs, highlights | `--color-primary` |
| **Secondary** (#4cd7f6) | Info, secondary actions | `--color-secondary` |
| **Tertiary** (#4fdbc8) | Success, active states | `--color-tertiary` |
| **Error** (#ffb4ab) | Destructive actions | `--color-error` |
| **Surface** (#15121b) | Backgrounds | `--color-surface` |

---

## 📐 Spacing Quick Reference

| Size | Value | Usage |
|------|-------|-------|
| **xs** | 8px | Tight grouping |
| **sm** | 12px | Small gaps |
| **md** | 16px | Default gap |
| **lg** | 24px | Section spacing |
| **xl** | 32px | Major sections |

---

## 🧩 Component Quick Reference

### Button
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>
```

### Card
```tsx
<Card glow>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### Input
```tsx
<Input label="Email" type="email" placeholder="Enter email" />
<Textarea label="Message" placeholder="Enter message" />
<Select label="Option" options={[...]} />
```

### Badge
```tsx
<Badge variant="primary">Primary</Badge>
<Badge variant="tertiary">Success</Badge>
<Badge variant="error">Error</Badge>
```

### Modal
```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Title">
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </ModalFooter>
</Modal>
```

### Tabs
```tsx
<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1', content: <Content1 /> },
    { id: 'tab2', label: 'Tab 2', content: <Content2 /> },
  ]}
/>
```

### Toast
```tsx
const { toasts, addToast, removeToast } = useToast();

addToast('Success!', 'success');
addToast('Error occurred', 'error');
addToast('Info message', 'info');

<ToastContainer toasts={toasts} onClose={removeToast} />
```

### Spinner
```tsx
<Spinner size="md" variant="primary" />
<LoadingState message="Loading..." />
```

### Alert
```tsx
<Alert
  type="success"
  title="Success"
  message="Operation completed"
/>
```

---

## 📱 Responsive Grid

### Mobile First
```tsx
// 1 column on mobile, 2 on tablet, 3 on desktop
<Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
  {items.map((item) => <Card key={item.id}>{item.name}</Card>)}
</Grid>
```

### Breakpoints
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

---

## 🎬 Animation Patterns

### Page Load
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4 }}
>
  Content
</motion.div>
```

### Stagger Children
```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }}
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

### Hover Effect
```tsx
<motion.div whileHover={{ scale: 1.02, y: -4 }}>
  <Card>Hover me</Card>
</motion.div>
```

---

## ✅ Common Patterns

### Dashboard Header
```tsx
<Flex justify="between" align="center" wrap>
  <Stack gap="sm">
    <h1>Dashboard</h1>
    <p>Welcome back, {user.name}</p>
  </Stack>
  <Flex gap="md">
    <Button variant="secondary">Secondary</Button>
    <Button variant="primary">Primary</Button>
  </Flex>
</Flex>
```

### Data Table Row
```tsx
<Flex justify="between" align="center" className="glass">
  <div>
    <p>{item.name}</p>
    <Badge variant="primary">{item.status}</Badge>
  </div>
  <Dropdown
    trigger={<MoreIcon />}
    items={[
      { id: 'edit', label: 'Edit', onClick: handleEdit },
      { id: 'delete', label: 'Delete', onClick: handleDelete },
    ]}
  />
</Flex>
```

### Form Section
```tsx
<Stack gap="lg">
  <h2>Form Title</h2>
  <Input label="Field 1" />
  <Input label="Field 2" />
  <Flex gap="md">
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Submit</Button>
  </Flex>
</Stack>
```

### Empty State
```tsx
<Stack gap="md" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
  <EmptyIcon size={48} />
  <h3>No items found</h3>
  <p>Create your first item to get started</p>
  <Button variant="primary">Create Item</Button>
</Stack>
```

---

## 🎯 Do's and Don'ts

### ✅ DO
- Use responsive Grid for layouts
- Apply glass effect to cards
- Use proper spacing scale
- Add animations to page transitions
- Use semantic HTML
- Test on mobile devices
- Use CSS variables for colors

### ❌ DON'T
- Use arbitrary spacing values
- Mix too many colors in one view
- Use glass on text-heavy content
- Animate every element
- Use animations > 500ms
- Forget accessibility
- Use inline styles for colors

---

## 🔗 CSS Variables Reference

```css
/* Colors */
--color-primary: #d0bcff
--color-secondary: #4cd7f6
--color-tertiary: #4fdbc8
--color-error: #ffb4ab
--color-surface: #15121b
--color-on-surface: #e7e0ed

/* Spacing */
--spacing-xs: 8px
--spacing-md: 16px
--spacing-lg: 24px

/* Shadows */
--shadow-glow: 0 0 40px rgba(139, 92, 246, 0.15)

/* Transitions */
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)

/* Fonts */
--font-inter: 'Inter', sans-serif
--font-mono: 'JetBrains Mono', monospace
```

---

## 📚 Full Documentation

- **Complete Guide:** `DESIGN-SYSTEM-IMPLEMENTATION.md`
- **Design System:** `DESIGN-SYSTEM.md`
- **Design Tokens:** `apps/web/src/styles/design-tokens.ts`
- **Global Styles:** `apps/web/src/styles/globals.css`

---

## 🆘 Troubleshooting

### Components not showing?
- Check imports are correct
- Verify CSS modules are imported
- Check globals.css is loaded

### Colors look wrong?
- Verify CSS variables are set in globals.css
- Check browser DevTools for computed styles
- Clear browser cache

### Animations not working?
- Verify framer-motion is installed
- Check motion components are imported
- Verify variants are correct

### Responsive not working?
- Check Grid columns prop
- Verify breakpoints in CSS
- Test with browser DevTools device mode

---

**Quick Start Version:** 1.0.0  
**Last Updated:** May 2026
