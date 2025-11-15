import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { Hand } from 'lucide-react';

interface ExtendedNodeViewProps extends ReactNodeViewProps {
  editor: any;
  getPos: () => number | undefined;
  deleteNode: () => void;
}

const ResizableImageComponent = ({ node, updateAttributes, selected, editor, getPos, deleteNode }: ExtendedNodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewPos, setDragPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const [hasError, setHasError] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: node.attrs.width || 300,
    height: node.attrs.height || 200,
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const aspectRatioRef = useRef(1);
  const currentDimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (imageRef.current && !node.attrs.width) {
      // Get natural dimensions on first load
      const img = imageRef.current;
      const loadHandler = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          aspectRatioRef.current = aspectRatio;
          const newWidth = img.naturalWidth;
          const newHeight = img.naturalHeight;
          setDimensions({ width: newWidth, height: newHeight });
          updateAttributes({ width: newWidth, height: newHeight });
        }
      };

      if (img.complete && img.naturalWidth) {
        loadHandler();
      } else {
        img.addEventListener('load', loadHandler);
        return () => img.removeEventListener('load', loadHandler);
      }
    } else if (node.attrs.width && node.attrs.height) {
      aspectRatioRef.current = node.attrs.width / node.attrs.height;
      setDimensions({ width: node.attrs.width, height: node.attrs.height });
    }
  }, [node.attrs.src, node.attrs.width, node.attrs.height]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };

    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      // Afficher un aperçu de la position où l'image sera insérée
      setDragPreviewPos({ top: e.clientY, left: e.clientX });
    };

    const handleDragEnd = (e: MouseEvent) => {
      setIsDragging(false);
      setDragPreviewPos(null);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);

      // Trouver la position la plus proche dans l'éditeur
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const editorView = editor.view;
      const coords = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
      
      if (coords) {
        const { state, dispatch } = editorView;
        const nodeSize = node.nodeSize;
        
        // Créer une transaction pour déplacer l'image
        const tr = state.tr;
        
        // Supprimer l'image de sa position actuelle
        tr.delete(pos, pos + nodeSize);
        
        // Calculer la nouvelle position (en tenant compte de la suppression)
        let newPos = coords.pos;
        if (newPos > pos) {
          newPos -= nodeSize;
        }
        
        // Insérer l'image à la nouvelle position avec tous ses attributs
        tr.insert(newPos, node);
        
        dispatch(tr);
      }
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleMouseDown = (e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPosRef.current.x;
      const deltaY = moveEvent.clientY - startPosRef.current.y;
      
      // Calculate delta based on corner
      let delta = 0;
      if (corner === 'bottom-right') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      } else if (corner === 'bottom-left') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY;
      } else if (corner === 'top-right') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY;
      } else if (corner === 'top-left') {
        delta = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : -deltaY;
      }
      
      const newWidth = Math.max(50, startPosRef.current.width + delta);
      const newHeight = newWidth / aspectRatioRef.current;

      currentDimensionsRef.current = { width: newWidth, height: newHeight };
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Use the ref values which are up-to-date
      const finalWidth = Math.round(currentDimensionsRef.current.width);
      const finalHeight = Math.round(currentDimensionsRef.current.height);
      
      // Update attributes with the final dimensions
      updateAttributes({ width: finalWidth, height: finalHeight });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      <NodeViewWrapper 
        className={`resizable-image-wrapper ${isDragging ? 'opacity-50' : ''}`}
        style={{ 
          display: node.attrs.display || 'inline-block',
          verticalAlign: 'middle',
          margin: node.attrs.margin || '0 4px',
          float: node.attrs.float || 'none',
          cursor: isDragging ? 'grabbing' : (selected ? 'grab' : 'default')
        }}
      >
        <div
          ref={containerRef}
          className={`relative inline-block group ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
          style={{ width: dimensions.width, height: dimensions.height, display: 'inline-block' }}
          onMouseDown={selected ? handleDragStart : undefined}
        >
        {hasError ? (
          <div 
            className="flex items-center justify-center bg-muted text-muted-foreground rounded-lg"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <div className="text-center p-4">
              <span className="text-2xl mb-2">⚠️</span>
              <p className="text-sm">Image non disponible</p>
            </div>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            title={node.attrs.title || ''}
            className="max-w-full h-auto rounded-lg block"
            style={{ width: dimensions.width, height: dimensions.height }}
            draggable={false}
            data-no-modal="true"
            onError={() => setHasError(true)}
          />
        )}
        
        {/* Bouton "Voir l'image" qui apparaît au survol */}
        <button
          data-image-modal={node.attrs.src}
          className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex items-center gap-1"
          type="button"
        >
          <span>👁️</span>
          <span>Voir</span>
        </button>
        
        {selected && (
          <>
            {/* Options de positionnement */}
            <div className="absolute -top-12 left-0 bg-background border border-border rounded-md shadow-lg p-2 flex gap-2 z-20">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ float: 'left', margin: '0 1rem 1rem 0', display: 'inline-block' });
                }}
                className="px-3 py-1 text-sm rounded hover:bg-accent"
                title="Flottant à gauche"
                type="button"
              >
                ←
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ float: 'none', margin: '1rem auto', display: 'block' });
                }}
                className="px-3 py-1 text-sm rounded hover:bg-accent"
                title="Centré"
                type="button"
              >
                ⬌
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ float: 'right', margin: '0 0 1rem 1rem', display: 'inline-block' });
                }}
                className="px-3 py-1 text-sm rounded hover:bg-accent"
                title="Flottant à droite"
                type="button"
              >
                →
              </button>
            </div>
            
            {/* Indication de déplacement - icône main */}
            <div className="absolute -top-12 left-[180px] bg-background border border-border rounded-md shadow-lg px-2 py-1.5 z-20">
              <Hand size={16} className="text-muted-foreground" />
            </div>
            
            {/* Corner resize handles */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full cursor-se-resize border-2 border-background shadow-md z-10"
              style={{ transform: 'translate(50%, 50%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'bottom-right');
              }}
            />
            <div
              className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full cursor-ne-resize border-2 border-background shadow-md z-10"
              style={{ transform: 'translate(50%, -50%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'top-right');
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-4 h-4 bg-primary rounded-full cursor-sw-resize border-2 border-background shadow-md z-10"
              style={{ transform: 'translate(-50%, 50%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'bottom-left');
              }}
            />
            <div
              className="absolute top-0 left-0 w-4 h-4 bg-primary rounded-full cursor-nw-resize border-2 border-background shadow-md z-10"
              style={{ transform: 'translate(-50%, -50%)' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, 'top-left');
              }}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
    
    {/* Indicateur de position de drop pendant le drag */}
    {isDragging && dragPreviewPos && (
      <div
        style={{
          position: 'fixed',
          top: dragPreviewPos.top - 10,
          left: dragPreviewPos.left,
          width: '2px',
          height: '20px',
          backgroundColor: 'hsl(var(--primary))',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 0 10px hsl(var(--primary))'
        }}
      />
    )}
  </>
  );
};

export const ResizableImage = Node.create({
  name: 'resizableImage',

  group: 'inline',
  
  inline: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.getAttribute('src'),
        renderHTML: attributes => {
          if (!attributes.src) {
            return {};
          }
          return { src: attributes.src };
        },
      },
      alt: {
        default: null,
        parseHTML: element => element.getAttribute('alt'),
        renderHTML: attributes => {
          if (!attributes.alt) {
            return {};
          }
          return { alt: attributes.alt };
        },
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return { title: attributes.title };
        },
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return { height: attributes.height };
        },
      },
      float: {
        default: 'none',
        parseHTML: element => {
          const float = element.style.float || element.getAttribute('data-float');
          return float || 'none';
        },
        renderHTML: attributes => {
          if (!attributes.float || attributes.float === 'none') return {};
          return { 
            'data-float': attributes.float,
            style: `float: ${attributes.float}`
          };
        },
      },
      margin: {
        default: '0 4px',
        parseHTML: element => {
          const margin = element.style.margin || element.getAttribute('data-margin');
          return margin || '0 4px';
        },
        renderHTML: attributes => {
          if (!attributes.margin) return {};
          return { 
            'data-margin': attributes.margin,
            style: `margin: ${attributes.margin}`
          };
        },
      },
      display: {
        default: 'inline-block',
        parseHTML: element => {
          const display = element.style.display || element.getAttribute('data-display');
          return display || 'inline-block';
        },
        renderHTML: attributes => {
          if (!attributes.display || attributes.display === 'inline-block') return {};
          return { 
            'data-display': attributes.display,
            style: `display: ${attributes.display}`
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          
          const width = element.getAttribute('width');
          const height = element.getAttribute('height');
          const src = element.getAttribute('src');
          const alt = element.getAttribute('alt');
          const title = element.getAttribute('title');
          
          return {
            src,
            alt,
            title,
            width: width ? parseInt(width, 10) : null,
            height: height ? parseInt(height, 10) : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const styles = ['display: inline-block', 'vertical-align: middle', 'margin: 0 4px'];
    
    if (HTMLAttributes.style) {
      // Merge with existing styles
      const existingStyles = HTMLAttributes.style.split(';').filter((s: string) => s.trim());
      styles.push(...existingStyles);
    }
    
    if (HTMLAttributes.float && HTMLAttributes.float !== 'none') {
      styles.push(`float: ${HTMLAttributes.float}`);
    }
    
    if (HTMLAttributes.margin) {
      const marginIndex = styles.findIndex(s => s.trim().startsWith('margin:'));
      if (marginIndex >= 0) {
        styles[marginIndex] = `margin: ${HTMLAttributes.margin}`;
      } else {
        styles.push(`margin: ${HTMLAttributes.margin}`);
      }
    }
    
    if (HTMLAttributes.display && HTMLAttributes.display !== 'inline-block') {
      const displayIndex = styles.findIndex(s => s.trim().startsWith('display:'));
      if (displayIndex >= 0) {
        styles[displayIndex] = `display: ${HTMLAttributes.display}`;
      } else {
        styles.push(`display: ${HTMLAttributes.display}`);
      }
    }
    
    return ['img', mergeAttributes(HTMLAttributes, { 
      class: 'rounded-lg',
      style: styles.join('; ')
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
