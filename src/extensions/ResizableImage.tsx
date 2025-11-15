import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Layers, ArrowUp, ArrowDown } from 'lucide-react';

interface ExtendedNodeViewProps extends ReactNodeViewProps {
  editor: any;
  getPos: () => number | undefined;
  deleteNode: () => void;
}

const ResizableImageComponent = ({ node, updateAttributes, selected, editor, getPos, deleteNode }: ExtendedNodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
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
      e.preventDefault();
      
      const editorView = editor.view;
      const coords = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
      
      if (coords) {
        // Obtenir les coordonnées du DOM pour cette position
        const domCoords = editorView.coordsAtPos(coords.pos);
        setDragPreviewPos({ x: domCoords.left, y: domCoords.top });
      }
    };

    const handleDragEnd = (e: MouseEvent) => {
      setIsDragging(false);
      setDragPreviewPos(null);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);

      // Trouver la position dans l'éditeur
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const editorView = editor.view;
      const editorRect = editorView.dom.getBoundingClientRect();
      
      // Vérifier que le drop est bien dans l'éditeur
      if (e.clientX < editorRect.left || 
          e.clientX > editorRect.right || 
          e.clientY < editorRect.top || 
          e.clientY > editorRect.bottom) {
        // Drop en dehors de l'éditeur - annuler
        return;
      }
      
      const coords = editorView.posAtCoords({ left: e.clientX, top: e.clientY });
      
      if (coords && coords.pos >= 0 && coords.pos <= editorView.state.doc.content.size) {
        const { state, dispatch } = editorView;
        const nodeSize = node.nodeSize;
        const tr = state.tr;
        
        tr.delete(pos, pos + nodeSize);
        
        let newPos = coords.pos;
        if (newPos > pos) {
          newPos -= nodeSize;
        }
        
        // Valider que la nouvelle position est valide
        if (newPos >= 0 && newPos <= tr.doc.content.size) {
          tr.insert(newPos, node);
          dispatch(tr);
        }
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
        className="react-component"
        data-drag-handle
        style={{
          cursor: isDragging ? 'grabbing' : (selected ? 'grab' : 'default'),
          float: node.attrs.float || 'none',
          margin: node.attrs.margin || '0 4px',
          display: node.attrs.display || 'inline-block',
          maxWidth: (node.attrs.float && node.attrs.float !== 'none') ? '60%' : '100%'
        }}
      >
        <div
          ref={containerRef}
          className={`relative inline-block group ${selected ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''} ${isDragging ? 'opacity-30' : ''}`}
          style={{ 
            width: dimensions.width, 
            height: dimensions.height
          }}
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
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              maxWidth: '100%'
            }}
            draggable={false}
            data-no-modal="true"
            onError={() => setHasError(true)}
          />
        )}
        
        {/* Contrôles de positionnement */}
        {selected && (
          <>
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-2 flex gap-1 z-20">
              {/* Alignement */}
              <div className="flex gap-1 border-r border-border pr-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateAttributes({ float: 'left', margin: '0 16px 8px 0' });
                  }}
                  className={`p-2 rounded hover:bg-accent ${node.attrs.float === 'left' ? 'bg-accent' : ''}`}
                  title="Texte à droite"
                  type="button"
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateAttributes({ float: 'none', margin: '8px auto', display: 'block' });
                  }}
                  className={`p-2 rounded hover:bg-accent ${node.attrs.float === 'none' || !node.attrs.float ? 'bg-accent' : ''}`}
                  title="Centré"
                  type="button"
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateAttributes({ float: 'right', margin: '0 0 8px 16px' });
                  }}
                  className={`p-2 rounded hover:bg-accent ${node.attrs.float === 'right' ? 'bg-accent' : ''}`}
                  title="Texte à gauche"
                  type="button"
                >
                  <AlignRight className="h-4 w-4" />
                </button>
              </div>
              
              {/* Z-index */}
              <div className="flex gap-1 pl-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentZ = node.attrs.zIndex || 0;
                    updateAttributes({ zIndex: currentZ + 1 });
                  }}
                  className="p-2 rounded hover:bg-accent"
                  title="Mettre au premier plan"
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentZ = node.attrs.zIndex || 0;
                    updateAttributes({ zIndex: Math.max(0, currentZ - 1) });
                  }}
                  className="p-2 rounded hover:bg-accent"
                  title="Mettre en arrière-plan"
                  type="button"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
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
    
    {/* Rectangle fantôme pendant le drag */}
    {isDragging && dragPreviewPos && (
      <div
        style={{
          position: 'fixed',
          top: dragPreviewPos.y,
          left: dragPreviewPos.x,
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: 'hsl(var(--primary) / 0.15)',
          border: '2px dashed hsl(var(--primary))',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
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
          const classList = element.classList;
          if (classList.contains('image-float-left')) return 'left';
          if (classList.contains('image-float-right')) return 'right';
          return 'none';
        },
        renderHTML: attributes => {
          return {};
        },
      },
      margin: {
        default: '0 4px',
        renderHTML: () => {
          return {};
        },
      },
      display: {
        default: 'inline-block',
        renderHTML: () => {
          return {};
        },
      },
      zIndex: {
        default: 0,
        parseHTML: element => {
          const zIndex = element.style.zIndex;
          return zIndex ? parseInt(zIndex, 10) : 0;
        },
        renderHTML: attributes => {
          return {};
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
          
          let float = 'none';
          if (element.classList.contains('image-float-left')) float = 'left';
          if (element.classList.contains('image-float-right')) float = 'right';
          
          return {
            src,
            alt,
            title,
            width: width ? parseInt(width, 10) : null,
            height: height ? parseInt(height, 10) : null,
            float,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const classes = ['rounded-lg'];
    const styles: Record<string, string> = {};
    
    // Ajouter les classes de float
    if (HTMLAttributes.float === 'left') {
      classes.push('image-float-left');
    } else if (HTMLAttributes.float === 'right') {
      classes.push('image-float-right');
    } else {
      classes.push('image-center');
    }
    
    // Ajouter z-index
    if (HTMLAttributes.zIndex) {
      styles['z-index'] = HTMLAttributes.zIndex;
      styles['position'] = 'relative';
    }
    
    return ['img', mergeAttributes(HTMLAttributes, { 
      class: classes.join(' '),
      style: Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';')
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});
