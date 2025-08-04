# Design Document

## Overview

Este documento detalha o design técnico para implementar as melhorias de UI no site da JR Imóveis, incluindo remoção de seções, correção de formulários, implementação de carrossel e ajustes de layout responsivo.

## Architecture

### Component Structure
- **Header Component**: Atualização do botão WhatsApp
- **Home Page Component**: Remoção da seção de corretores e ajustes de layout
- **Contact Form**: Correção das validações e máscaras
- **Property Modal**: Implementação do carrossel de imagens
- **Hero Section**: Ajustes de responsividade e alinhamento

### Dependencies
- `react-responsive-carousel`: Para implementar o carrossel de imagens
- `react-hook-form`: Já presente, será corrigido para funcionar adequadamente
- `react-input-mask`: Já presente, será corrigido para funcionar adequadamente

## Components and Interfaces

### 1. Header Component Updates

**Changes Required:**
- Adicionar ícone do WhatsApp ao botão "Fale Conosco"
- Garantir redirecionamento correto para WhatsApp

```typescript
// Header.tsx updates
const whatsappIcon = "https://www.svgrepo.com/show/22753/whatsapp-logo-variant.svg";
const whatsappUrl = "https://wa.me/5518997398482";
```

### 2. Home Page Section Removal

**Changes Required:**
- Remover completamente a seção "Agents Section"
- Manter alternância de cores entre seções restantes
- Atualizar navegação se necessário

**Section Color Pattern:**
1. Hero Section: Background image with overlay
2. About Section: `bg-white`
3. Featured Properties: `bg-light-gray`
4. All Properties: `bg-white`
5. Services: `bg-light-gray`
6. Testimonials: `bg-white`
7. Contact: `bg-white` (manter como está)

### 3. Contact Form Validation

**Current Issues:**
- React Hook Form não está sendo importado corretamente
- InputMask não está sendo aplicado adequadamente
- Validações não estão aparecendo

**Solution Design:**
```typescript
interface ContactFormInputs {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// Proper form implementation with validation
const { register, handleSubmit, formState: { errors } } = useForm<ContactFormInputs>();
```

### 4. Property Modal Carousel

**Implementation Design:**
- Usar `react-responsive-carousel` para navegação de imagens
- Implementar controles de navegação (setas e indicadores)
- Garantir responsividade
- Fallback para imagem única quando não há galeria

**Component Structure:**
```typescript
// Modal with carousel
{selectedProperty.gallery && selectedProperty.gallery.length > 1 ? (
  <Carousel>
    {selectedProperty.gallery.map((image, index) => (
      <div key={index}>
        <img src={image} alt={`${selectedProperty.title} - ${index + 1}`} />
      </div>
    ))}
  </Carousel>
) : (
  <img src={selectedProperty.image} alt={selectedProperty.title} />
)}
```

### 5. Hero Section Layout Fixes

**Desktop Alignment:**
- Botão "Buscar" deve ter `h-full` para igualar altura dos inputs
- Usar `items-end` no grid para alinhamento inferior

**Mobile Responsiveness:**
- Adicionar padding-top adequado para evitar sobreposição com header fixo
- Ajustar min-height para garantir que o conteúdo não seja cortado
- Implementar breakpoints específicos para mobile

**CSS Adjustments:**
```css
/* Hero section mobile fixes */
@media (max-width: 768px) {
  .hero-section {
    padding-top: 80px; /* Account for fixed header */
    min-height: calc(70vh + 80px);
  }
}
```

## Data Models

### Property Interface Update
```typescript
interface Property {
  id: number;
  title: string;
  type: string;
  neighborhood: string;
  city: string;
  price: string;
  beds: number;
  baths: number;
  area: number;
  image: string;
  gallery: string[]; // Ensure this exists
  description: string;
  features: string[];
  amenities: string[];
}
```

## Error Handling

### Form Validation Errors
- Implementar mensagens de erro específicas para cada campo
- Garantir que erros sejam limpos quando campos são corrigidos
- Adicionar feedback visual para estados de erro

### Carousel Error Handling
- Verificar se `gallery` existe antes de renderizar carousel
- Fallback para imagem principal se galeria estiver vazia
- Tratamento de erro para imagens que não carregam

### Mobile Layout Error Prevention
- Usar CSS clamp() para tamanhos responsivos
- Implementar media queries específicas
- Testar em diferentes tamanhos de tela

## Testing Strategy

### Unit Tests
- Testar validação de formulário com diferentes inputs
- Verificar funcionamento do carousel com diferentes quantidades de imagens
- Validar responsividade em diferentes breakpoints

### Integration Tests
- Testar fluxo completo do formulário de contato
- Verificar navegação do carousel no modal
- Testar redirecionamento do WhatsApp

### Visual Regression Tests
- Comparar layout antes e depois das mudanças
- Verificar alinhamento em diferentes dispositivos
- Confirmar alternância de cores das seções

### Manual Testing Checklist
1. Verificar remoção da seção de corretores
2. Testar formulário de contato com validações
3. Confirmar funcionamento do botão WhatsApp
4. Navegar pelo carousel de imagens
5. Testar responsividade em mobile
6. Verificar alinhamento do botão "Buscar"