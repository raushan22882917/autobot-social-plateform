# Synthetic Transcendence - Component Showcase & Reference

## 🎨 Complete Component Library Reference

This document showcases all available components with usage examples.

---

## 📦 UI Components

### 1. Button Component

**File:** `apps/web/src/components/ui/Button.tsx`

#### Variants
```tsx
// Primary (Main CTA)
<Button variant="primary">Create Product</Button>

// Secondary (Alternative action)
<Button variant="secondary">Cancel</Button>

// Ghost (Tertiary action)
<Button variant="ghost">Learn More</Button>

// Danger (Destructive action)
<Button variant="danger">Delete</Button>
```

#### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

#### States
```tsx
// With icon
<Button icon={<PlusIcon />}>Add Item</Button>

// Loading
<Button loading>Processing...</Button>

// Disabled
<Button disabled>Disabled</Button>

// Full width
<Button fullWidth>Full Width Button</Button>
```

#### Best Practices
- Use primary for main CTAs
- Use secondary for alternative actions
- Use danger for destructive actions
- Keep button text short and action-oriented
- Use icons to clarify action

---

### 2. Card Component

**File:** `apps/web/src/components/ui/Card.tsx`

#### Basic Usage
```tsx
<Card>
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    Card content goes here
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Variants
```tsx
// Default (Glass effect)
<Card>Content</Card>

// Elevated
<Card variant="elevated">Content</Card>

// Outlined
<Card variant="outlined">Content</Card>
```

#### With Glow
```tsx
<Card glow>
  <CardHeader>Featured Card</CardHeader>
  <CardBody>This card has a glow effect</CardBody>
</Card>
```

#### Responsive
```tsx
<Card>
  <CardHeader>
    <Flex justify="between" align="center">
      <h3>Title</h3>
      <Badge>New</Badge>
    </Flex>
  </CardHeader>
  <CardBody>
    <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
      {/* Content */}
    </Grid>
  </CardBody>
</Card>
```

#### Best Practices
- Use glow for featured/important cards
- Keep card content focused
- Use CardHeader for titles
- Use CardBody for main content
- Use CardFooter for actions

---

### 3. Input Component

**File:** `apps/web/src/components/ui/Input.tsx`

#### Text Input
```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

#### With Validation
```tsx
<Input
  label="Password"
  type="password"
  error={errors.password}
  helperText="Password must be at least 8 characters"
/>
```

#### Textarea
```tsx
<Textarea
  label="Description"
  placeholder="Enter description"
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

#### Select
```tsx
<Select
  label="Category"
  options={[
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'books', label: 'Books' },
  ]}
  value={category}
  onChange={(e) => setCategory(e.target.value)}
/>
```

#### States
```tsx
// Disabled
<Input disabled placeholder="Disabled input" />

// Read-only
<Input readOnly value="Read-only value" />

// With icon
<Input icon={<SearchIcon />} placeholder="Search..." />
```

#### Best Practices
- Always include labels
- Use appropriate input types
- Provide helpful placeholder text
- Show validation errors clearly
- Use helper text for guidance

---

### 4. Badge Component

**File:** `apps/web/src/components/ui/Badge.tsx`

#### Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="tertiary">Tertiary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
```

#### Chip Variant
```tsx
<Badge variant="primary" chip>
  Chip Badge
</Badge>
```

#### With Icon
```tsx
<Badge icon={<CheckIcon />}>Verified</Badge>
```

#### Dismissible
```tsx
<Badge onDismiss={() => handleRemove()}>
  Removable Badge
</Badge>
```

#### Best Practices
- Use for status indicators
- Use for tags and labels
- Use tertiary for success states
- Use error for critical states
- Keep text short

---

### 5. Modal Component

**File:** `apps/web/src/components/ui/Modal.tsx`

#### Basic Usage
```tsx
const [isOpen, setIsOpen] = useState(false);

<>
  <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

  <Modal
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    title="Modal Title"
  >
    <ModalBody>
      Modal content goes here
    </ModalBody>
    <ModalFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </ModalFooter>
  </Modal>
</>
```

#### Sizes
```tsx
<Modal size="sm">Small Modal</Modal>
<Modal size="md">Medium Modal</Modal>
<Modal size="lg">Large Modal</Modal>
```

#### Without Close Button
```tsx
<Modal closeButton={false}>
  Content
</Modal>
```

#### Best Practices
- Use for important confirmations
- Keep modal content focused
- Always provide close option
- Use appropriate size
- Add clear action buttons

---

### 6. Tabs Component

**File:** `apps/web/src/components/ui/Tabs.tsx`

#### Basic Usage
```tsx
<Tabs
  tabs={[
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewContent />,
    },
    {
      id: 'details',
      label: 'Details',
      content: <DetailsContent />,
    },
    {
      id: 'settings',
      label: 'Settings',
      content: <SettingsContent />,
    },
  ]}
  defaultTab="overview"
  onChange={(tabId) => console.log('Tab changed:', tabId)}
/>
```

#### Variants
```tsx
// Default
<Tabs variant="default" tabs={tabs} />

// Pills
<Tabs variant="pills" tabs={tabs} />

// Underline
<Tabs variant="underline" tabs={tabs} />
```

#### With Icons
```tsx
<Tabs
  tabs={[
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon />,
      content: <HomeContent />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      content: <SettingsContent />,
    },
  ]}
/>
```

#### Disabled Tabs
```tsx
<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1', content: <Content1 /> },
    { id: 'tab2', label: 'Tab 2', content: <Content2 />, disabled: true },
  ]}
/>
```

#### Best Practices
- Use for organizing related content
- Keep tab labels short
- Use icons for clarity
- Limit to 3-5 tabs
- Provide default tab

---

### 7. Dropdown Component

**File:** `apps/web/src/components/ui/Dropdown.tsx`

#### Basic Usage
```tsx
<Dropdown
  trigger={<Button icon={<MoreIcon />} />}
  items={[
    { id: 'edit', label: 'Edit', onClick: handleEdit },
    { id: 'delete', label: 'Delete', onClick: handleDelete },
  ]}
/>
```

#### With Icons
```tsx
<Dropdown
  trigger={<Button>Actions</Button>}
  items={[
    { id: 'edit', label: 'Edit', icon: <EditIcon />, onClick: handleEdit },
    { id: 'copy', label: 'Copy', icon: <CopyIcon />, onClick: handleCopy },
    { id: 'delete', label: 'Delete', icon: <TrashIcon />, onClick: handleDelete },
  ]}
/>
```

#### With Dividers
```tsx
<Dropdown
  trigger={<Button>Menu</Button>}
  items={[
    { id: 'edit', label: 'Edit', onClick: handleEdit },
    { id: 'copy', label: 'Copy', onClick: handleCopy },
    { id: 'divider1', divider: true },
    { id: 'delete', label: 'Delete', onClick: handleDelete },
  ]}
/>
```

#### Alignment
```tsx
// Left aligned (default)
<Dropdown align="left" trigger={<Button />} items={items} />

// Right aligned
<Dropdown align="right" trigger={<Button />} items={items} />
```

#### Best Practices
- Use for secondary actions
- Keep menu items concise
- Use icons for clarity
- Group related actions with dividers
- Disable unavailable actions

---

### 8. Toast Component

**File:** `apps/web/src/components/ui/Toast.tsx`

#### Using useToast Hook
```tsx
export function MyComponent() {
  const { toasts, addToast, removeToast } = useToast();

  const handleSuccess = () => {
    addToast('Operation successful!', 'success');
  };

  const handleError = () => {
    addToast('An error occurred', 'error');
  };

  return (
    <>
      <Button onClick={handleSuccess}>Show Success</Button>
      <Button onClick={handleError}>Show Error</Button>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
```

#### Toast Types
```tsx
// Success
addToast('Product created successfully', 'success');

// Error
addToast('Failed to save changes', 'error');

// Info
addToast('New update available', 'info');

// Warning
addToast('This action cannot be undone', 'warning');
```

#### With Action
```tsx
addToast('Changes saved', 'success', 5000, {
  label: 'Undo',
  onClick: handleUndo,
});
```

#### Custom Duration
```tsx
// Auto-dismiss after 3 seconds
addToast('Quick notification', 'info', 3000);

// Never auto-dismiss
addToast('Important message', 'warning', 0);
```

#### Best Practices
- Use for feedback messages
- Keep messages concise
- Use appropriate type
- Set reasonable duration
- Provide action when needed

---

### 9. Spinner Component

**File:** `apps/web/src/components/ui/Spinner.tsx`

#### Basic Usage
```tsx
<Spinner />
<Spinner size="md" variant="primary" />
```

#### Sizes
```tsx
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
```

#### Variants
```tsx
<Spinner variant="primary" />
<Spinner variant="secondary" />
<Spinner variant="tertiary" />
```

#### Loading State
```tsx
<LoadingState message="Loading data..." />
<LoadingState message="Processing..." size="lg" />
```

#### In Context
```tsx
{loading ? (
  <LoadingState message="Fetching products..." />
) : (
  <ProductList products={products} />
)}
```

#### Best Practices
- Use for async operations
- Show meaningful messages
- Use appropriate size
- Center on page
- Disable interactions while loading

---

### 10. Alert Component

**File:** `apps/web/src/components/ui/Alert.tsx`

#### Types
```tsx
<Alert type="success" message="Operation completed successfully" />
<Alert type="error" message="An error occurred" />
<Alert type="info" message="Here's some information" />
<Alert type="warning" message="Please be careful" />
```

#### With Title
```tsx
<Alert
  type="success"
  title="Success"
  message="Your changes have been saved"
/>
```

#### With Action
```tsx
<Alert
  type="warning"
  message="This action cannot be undone"
  action={{
    label: 'Learn More',
    onClick: handleLearnMore,
  }}
/>
```

#### Dismissible
```tsx
<Alert
  type="info"
  message="New feature available"
  onClose={() => setShowAlert(false)}
/>
```

#### Best Practices
- Use for important messages
- Keep messages clear
- Use appropriate type
- Provide action when needed
- Allow dismissal

---

## 🎯 Layout Components

### 1. Grid Component

**File:** `apps/web/src/components/layout/Grid.tsx`

#### Basic Usage
```tsx
<Grid columns={3} gap="md">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

#### Responsive Columns
```tsx
<Grid
  columns={{ mobile: 1, tablet: 2, desktop: 3 }}
  gap="md"
>
  {items.map((item) => <Card key={item.id}>{item.name}</Card>)}
</Grid>
```

#### Gap Options
```tsx
<Grid columns={3} gap="xs">Tight spacing</Grid>
<Grid columns={3} gap="sm">Small spacing</Grid>
<Grid columns={3} gap="md">Medium spacing</Grid>
<Grid columns={3} gap="lg">Large spacing</Grid>
<Grid columns={3} gap="xl">Extra large spacing</Grid>
```

---

### 2. Flex Component

**File:** `apps/web/src/components/layout/Grid.tsx`

#### Basic Usage
```tsx
<Flex justify="between" align="center">
  <h2>Title</h2>
  <Button>Action</Button>
</Flex>
```

#### Justify Options
```tsx
<Flex justify="start">Left aligned</Flex>
<Flex justify="center">Centered</Flex>
<Flex justify="end">Right aligned</Flex>
<Flex justify="between">Space between</Flex>
<Flex justify="around">Space around</Flex>
<Flex justify="evenly">Space evenly</Flex>
```

#### Align Options
```tsx
<Flex align="start">Top aligned</Flex>
<Flex align="center">Vertically centered</Flex>
<Flex align="end">Bottom aligned</Flex>
<Flex align="stretch">Stretched</Flex>
```

#### Direction
```tsx
<Flex direction="row">Horizontal</Flex>
<Flex direction="column">Vertical</Flex>
```

#### Wrap
```tsx
<Flex wrap>Items wrap to next line</Flex>
```

---

### 3. Stack Component

**File:** `apps/web/src/components/layout/Grid.tsx`

#### Basic Usage
```tsx
<Stack gap="lg">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Stack>
```

#### Gap Options
```tsx
<Stack gap="xs">Tight spacing</Stack>
<Stack gap="sm">Small spacing</Stack>
<Stack gap="md">Medium spacing</Stack>
<Stack gap="lg">Large spacing</Stack>
<Stack gap="xl">Extra large spacing</Stack>
```

---

### 4. Container Component

**File:** `apps/web/src/components/layout/Grid.tsx`

#### Basic Usage
```tsx
<Container maxWidth="lg" padding="lg">
  <h1>Page Title</h1>
  <p>Page content</p>
</Container>
```

#### Max Width Options
```tsx
<Container maxWidth="sm">Small container</Container>
<Container maxWidth="md">Medium container</Container>
<Container maxWidth="lg">Large container</Container>
<Container maxWidth="xl">Extra large container</Container>
<Container maxWidth="full">Full width</Container>
```

#### Padding Options
```tsx
<Container padding="sm">Small padding</Container>
<Container padding="md">Medium padding</Container>
<Container padding="lg">Large padding</Container>
```

---

## 🎬 Animation Patterns

### Page Transition
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4 }}
>
  Page content
</motion.div>
```

### Stagger Animation
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

## 🎨 Color Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #d0bcff | Main CTAs |
| Secondary | #4cd7f6 | Info, secondary actions |
| Tertiary | #4fdbc8 | Success, active states |
| Error | #ffb4ab | Destructive actions |
| Surface | #15121b | Backgrounds |
| On Surface | #e7e0ed | Text |

---

## 📚 Import Reference

```tsx
// Layout
import { Grid, Flex, Stack, Container } from '@/components/layout';

// UI Components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Select,
  Badge,
  Chip,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tabs,
  Dropdown,
  Toast,
  ToastContainer,
  useToast,
  Spinner,
  LoadingState,
  Alert,
} from '@/components/ui';

// Animations
import { motion } from 'framer-motion';

// Icons
import { Plus, Edit, Trash, Settings, ... } from 'lucide-react';
```

---

**Component Showcase Version:** 1.0.0  
**Last Updated:** May 2026
