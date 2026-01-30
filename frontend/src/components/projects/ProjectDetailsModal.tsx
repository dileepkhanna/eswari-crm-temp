import { useState } from 'react';
import { Project } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, MapPin, Calendar, DollarSign, Home, Landmark, Camera, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContextDjango';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProjectDetailsModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  planning: 'bg-info/15 text-info border-info/30',
  active: 'bg-success/15 text-success border-success/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function ProjectDetailsModal({ project, open, onClose }: ProjectDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { user } = useAuth();

  if (!project) return null;

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Create images array for sliding gallery
  const images = [project.coverImage, project.blueprintImage].filter(Boolean);

  const formatPrice = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `${val}`;
  };

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Function to load image as base64
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  // Function to download individual image
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      // For admin users, try to use the server download endpoint first
      if (isAdmin && project) {
        try {
          const { apiClient } = await import('@/lib/api');
          let blob: Blob;
          
          if (imageUrl === project.coverImage) {
            blob = await apiClient.downloadProjectCoverImage(project.id);
          } else if (imageUrl === project.blueprintImage) {
            blob = await apiClient.downloadProjectBlueprintImage(project.id);
          } else {
            throw new Error('Unknown image type');
          }
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success(`${filename} downloaded successfully`);
          return;
        } catch (serverError) {
          console.warn('Server download failed, falling back to direct download:', serverError);
        }
      }
      
      // Fallback to direct image download
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error(`Failed to download ${filename}`);
    }
  };

  // Function to generate and download PDF with project details and images
  const downloadProjectPDF = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can download project PDFs');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(project.name, 20, yPosition);
      yPosition += 15;

      // Add project details
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      // Basic info
      pdf.text(`Location: ${project.location || 'Not specified'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Type: ${project.type}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Status: ${project.status}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Price Range: ₹${formatPrice(project.priceMin)} - ₹${formatPrice(project.priceMax)}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Launch Date: ${project.launchDate && !isNaN(project.launchDate.getTime()) ? format(project.launchDate, 'MMM dd, yyyy') : 'TBD'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Possession Date: ${project.possessionDate && !isNaN(project.possessionDate.getTime()) ? format(project.possessionDate, 'MMM dd, yyyy') : 'TBD'}`, 20, yPosition);
      yPosition += 15;

      // Description
      if (project.description) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Description:', 20, yPosition);
        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        const descriptionLines = pdf.splitTextToSize(project.description, pageWidth - 40);
        pdf.text(descriptionLines, 20, yPosition);
        yPosition += descriptionLines.length * 6 + 10;
      }

      // Tower details
      if (project.towerDetails) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tower Details:', 20, yPosition);
        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        pdf.text(project.towerDetails, 20, yPosition);
        yPosition += 15;
      }

      // Amenities
      if (project.amenities.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Amenities:', 20, yPosition);
        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        const amenitiesText = project.amenities.join(', ');
        const amenitiesLines = pdf.splitTextToSize(amenitiesText, pageWidth - 40);
        pdf.text(amenitiesLines, 20, yPosition);
        yPosition += amenitiesLines.length * 6 + 10;
      }

      // Nearby landmarks
      if (project.nearbyLandmarks.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Nearby Landmarks:', 20, yPosition);
        yPosition += 8;
        pdf.setFont('helvetica', 'normal');
        const landmarksText = project.nearbyLandmarks.join(', ');
        const landmarksLines = pdf.splitTextToSize(landmarksText, pageWidth - 40);
        pdf.text(landmarksLines, 20, yPosition);
        yPosition += landmarksLines.length * 6 + 15;
      }

      // Add images if available
      if (images.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text('Project Images:', 20, yPosition);
        yPosition += 15;

        for (let i = 0; i < images.length; i++) {
          try {
            const imageBase64 = await loadImageAsBase64(images[i]);
            const imageType = images[i] === project.coverImage ? 'Cover Image' : 'Blueprint';
            
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.setFont('helvetica', 'normal');
            pdf.text(`${imageType}:`, 20, yPosition);
            yPosition += 10;

            // Add image (scaled to fit page width)
            const maxWidth = pageWidth - 40;
            const maxHeight = 60;
            pdf.addImage(imageBase64, 'JPEG', 20, yPosition, maxWidth, maxHeight);
            yPosition += maxHeight + 15;
          } catch (error) {
            console.error('Error adding image to PDF:', error);
            pdf.text(`${images[i] === project.coverImage ? 'Cover Image' : 'Blueprint'}: Failed to load`, 20, yPosition);
            yPosition += 10;
          }
        }
      }

      // Add footer
      const currentDate = new Date().toLocaleDateString();
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${currentDate} by ${user?.name || 'Admin'}`, 20, pageHeight - 10);

      // Save the PDF
      const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_project_details.pdf`;
      pdf.save(filename);
      toast.success('Project PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building className="w-5 h-5 text-primary" />
            Project Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-0">
          {/* Hero Image Gallery */}
          {images.length > 0 ? (
            <div className="relative h-48 md:h-64 overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={project.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Image indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}

              {/* Status and Image type badges */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <div className="flex gap-2">
                  {images[currentImageIndex] === project.coverImage && (
                    <Badge className="bg-primary text-xs">Cover Image</Badge>
                  )}
                  {images[currentImageIndex] === project.blueprintImage && (
                    <Badge className="bg-blue-500 text-xs">Blueprint</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge 
                    className={cn(
                      "capitalize border",
                      statusColors[project.status]
                    )}
                  >
                    {project.status}
                  </Badge>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white mb-1">{project.name}</h2>
                <div className="flex items-center gap-1 text-white/80 text-sm">
                  <MapPin className="w-4 h-4" />
                  {project.location || 'Location not specified'}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-48 md:h-64 overflow-hidden bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>No images available</p>
              </div>
              <Badge 
                className={cn(
                  "absolute top-4 right-4 capitalize border",
                  statusColors[project.status]
                )}
              >
                {project.status}
              </Badge>
            </div>
          )}

          <div className="p-4 md:p-6 space-y-6">
            {/* Price & Type */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-muted-foreground" />
                <span className="capitalize font-medium">{project.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xl font-bold text-primary">
                <DollarSign className="w-5 h-5" />
                {formatPrice(project.priceMin)} - {formatPrice(project.priceMax)}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{project.description}</p>
            </div>

            {/* Tower Details */}
            {project.towerDetails && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Tower Details
                </h3>
                <p className="text-muted-foreground">{project.towerDetails}</p>
              </div>
            )}

            {/* Amenities */}
            <div>
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {project.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Nearby Landmarks */}
            {project.nearbyLandmarks && project.nearbyLandmarks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  Nearby Landmarks
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.nearbyLandmarks.map((landmark) => (
                    <Badge key={landmark} variant="outline">
                      {landmark}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-6 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Launch:</span>
                <span className="font-medium">{project.launchDate && !isNaN(project.launchDate.getTime()) ? format(project.launchDate, 'MMM yyyy') : 'TBD'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Possession:</span>
                <span className="font-medium">{project.possessionDate && !isNaN(project.possessionDate.getTime()) ? format(project.possessionDate, 'MMM yyyy') : 'TBD'}</span>
              </div>
            </div>

            {/* Admin Download Section */}
            {isAdmin && images.length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Options (Admin Only)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadProjectPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Complete Project PDF
                      </>
                    )}
                  </Button>
                  {project.coverImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(project.coverImage, `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover.jpg`)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Cover Image
                    </Button>
                  )}
                  {project.blueprintImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(project.blueprintImage, `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_blueprint.jpg`)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Blueprint
                    </Button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}