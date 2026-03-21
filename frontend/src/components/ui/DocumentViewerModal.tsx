import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Loader2,
  AlertCircle,
  Eye,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
  title?: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  open,
  onOpenChange,
  documentUrl,
  documentName,
  title = 'Document Viewer'
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const isMarkdownFile = documentName.toLowerCase().endsWith('.md');
  const isTextFile = documentName.toLowerCase().match(/\.(txt|md|json|xml|csv|log)$/);
  const isImageFile = documentName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/);
  const isViewableFile = isTextFile || isImageFile;

  useEffect(() => {
    if (open && isTextFile) {
      loadDocumentContent();
    }
    // Reset image controls when modal opens
    if (open && isImageFile) {
      setImageZoom(1);
      setImageRotation(0);
    }
  }, [open, documentUrl, isTextFile, isImageFile]);

  const loadDocumentContent = async () => {
    if (!isTextFile) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch the document content directly
      const response = await fetch(documentUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }
      
      const text = await response.text();
      setContent(text);
    } catch (err) {
      logger.error('Failed to load document content:', err);
      setError('Failed to load document content. You can still download the file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloaded ${documentName}`);
    } catch (error) {
      logger.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const getFileIcon = () => {
    if (documentName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (documentName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/)) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    if (documentName.toLowerCase().match(/\.(doc|docx)$/)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (documentName.toLowerCase().match(/\.(xls|xlsx)$/)) {
      return <FileText className="w-5 h-5 text-green-600" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const getFileType = () => {
    if (isImageFile) return 'Image';
    if (isMarkdownFile) return 'Markdown Document';
    if (isTextFile) return 'Text Document';
    if (documentName.toLowerCase().endsWith('.pdf')) return 'PDF Document';
    return 'Document';
  };

  const handleImageZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleImageZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleImageReset = () => {
    setImageZoom(1);
    setImageRotation(0);
  };

  const getFileSize = () => {
    // This would need to be passed as a prop or fetched separately
    return null;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading document...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Cannot preview this document</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download to view
          </Button>
        </div>
      );
    }

    // Handle image files
    if (isImageFile) {
      return (
        <div className="space-y-4">
          {/* Image Info and Controls */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <h4 className="font-medium">{documentName}</h4>
                <p className="text-sm text-muted-foreground">
                  {getFileType()}
                  {getFileSize() && ` • ${getFileSize()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleImageZoomOut}
                disabled={imageZoom <= 0.25}
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                {Math.round(imageZoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImageZoomIn}
                disabled={imageZoom >= 3}
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImageRotate}
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImageReset}
                title="Reset view"
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Image Viewer */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span className="font-medium">Image Preview</span>
                <Badge variant="secondary" className="text-xs">
                  {imageZoom !== 1 && `${Math.round(imageZoom * 100)}% zoom`}
                  {imageRotation !== 0 && ` • ${imageRotation}° rotated`}
                  {imageZoom === 1 && imageRotation === 0 && 'Original size'}
                </Badge>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-muted/10 min-h-[300px] max-h-[500px] overflow-auto">
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                }}
                onError={(e) => {
                  logger.error('Image failed to load:', e);
                  setError('Failed to load image. You can still download the file.');
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Handle non-viewable files
    if (!isViewableFile) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {getFileIcon()}
          <h3 className="text-lg font-medium mb-2 mt-4">Preview not available</h3>
          <p className="text-muted-foreground mb-4">
            This file type cannot be previewed in the browser.
          </p>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download to view
          </Button>
        </div>
      );
    }

    // Handle text files (existing functionality)
    return (
      <div className="space-y-4">
        {/* Document Info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <h4 className="font-medium">{documentName}</h4>
              <p className="text-sm text-muted-foreground">
                {getFileType()}
                {getFileSize() && ` • ${getFileSize()}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        {/* Document Content */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="font-medium">Document Preview</span>
              <Badge variant="secondary" className="text-xs">
                {content.split('\n').length} lines
              </Badge>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {isMarkdownFile ? (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/30 p-4 rounded">
                  {content}
                </pre>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {content}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImageFile ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            Viewing: {documentName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewerModal;