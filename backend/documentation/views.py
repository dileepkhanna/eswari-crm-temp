import os
import glob
from datetime import datetime
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import mimetypes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_documentation(request):
    """List all available documentation files"""
    try:
        # Get the project root directory (where documentation files are stored)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Define patterns for documentation files
        doc_patterns = [
            '*.md',
            '**/*.md',
        ]
        
        documents = []
        
        # Search for documentation files
        for pattern in doc_patterns:
            for file_path in glob.glob(os.path.join(project_root, pattern), recursive=True):
                # Skip files in certain directories
                skip_dirs = ['node_modules', '.git', '.venv', '__pycache__', 'venv', 'env']
                if any(skip_dir in file_path for skip_dir in skip_dirs):
                    continue
                
                # Get file info
                filename = os.path.basename(file_path)
                relative_path = os.path.relpath(file_path, project_root)
                
                # Skip README files and other generic files
                if filename.lower() in ['readme.md', 'license.md', 'changelog.md']:
                    continue
                
                # Get file stats
                stat = os.stat(file_path)
                size = stat.st_size
                modified = datetime.fromtimestamp(stat.st_mtime)
                
                # Categorize based on filename patterns
                category = categorize_document(filename)
                
                # Generate title from filename
                title = generate_title(filename)
                
                # Generate description
                description = generate_description(filename, file_path)
                
                # Generate tags
                tags = generate_tags(filename, file_path)
                
                documents.append({
                    'id': relative_path.replace('\\', '/'),
                    'title': title,
                    'filename': filename,
                    'path': relative_path.replace('\\', '/'),
                    'category': category,
                    'description': description,
                    'size': format_file_size(size),
                    'lastModified': modified.strftime('%Y-%m-%d'),
                    'tags': tags,
                })
        
        # Sort by last modified date (newest first)
        documents.sort(key=lambda x: x['lastModified'], reverse=True)
        
        return Response({
            'documents': documents,
            'total': len(documents)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to list documentation: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_document_content(request, document_path):
    """Get the content of a specific documentation file"""
    try:
        # Get the project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Construct full file path
        full_path = os.path.join(project_root, document_path)
        
        # Security check: ensure the path is within the project directory
        if not os.path.commonpath([project_root, full_path]) == project_root:
            raise Http404("Document not found")
        
        # Check if file exists
        if not os.path.exists(full_path):
            raise Http404("Document not found")
        
        # Read file content
        with open(full_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Get file info
        stat = os.stat(full_path)
        
        return Response({
            'content': content,
            'filename': os.path.basename(full_path),
            'size': format_file_size(stat.st_size),
            'lastModified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
        })
        
    except Http404:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to read document: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document(request, document_path):
    """Download a specific documentation file"""
    try:
        # Get the project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        # Construct full file path
        full_path = os.path.join(project_root, document_path)
        
        # Security check: ensure the path is within the project directory
        if not os.path.commonpath([project_root, full_path]) == project_root:
            raise Http404("Document not found")
        
        # Check if file exists
        if not os.path.exists(full_path):
            raise Http404("Document not found")
        
        # Read file content
        with open(full_path, 'rb') as file:
            content = file.read()
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(full_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Create response
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(full_path)}"'
        
        return response
        
    except Http404:
        return Response(
            {'error': 'Document not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to download document: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def categorize_document(filename):
    """Categorize document based on filename patterns"""
    filename_lower = filename.lower()
    
    if any(word in filename_lower for word in ['bug', 'fix', 'error', 'issue']):
        return 'bugfixes'
    elif any(word in filename_lower for word in ['test', 'spec', 'qa']):
        return 'testing'
    elif any(word in filename_lower for word in ['setup', 'install', 'config', 'guide']):
        return 'setup'
    elif any(word in filename_lower for word in ['brand', 'theme', 'ui', 'design']):
        return 'branding'
    elif any(word in filename_lower for word in ['feature', 'implementation', 'complete']):
        return 'features'
    else:
        return 'general'

def generate_title(filename):
    """Generate a human-readable title from filename"""
    # Remove extension
    title = os.path.splitext(filename)[0]
    
    # Replace underscores and hyphens with spaces
    title = title.replace('_', ' ').replace('-', ' ')
    
    # Capitalize words
    title = ' '.join(word.capitalize() for word in title.split())
    
    return title

def generate_description(filename, file_path):
    """Generate description based on filename and content"""
    filename_lower = filename.lower()
    
    # Try to read first few lines for description
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()[:10]  # Read first 10 lines
            
            # Look for description patterns
            for line in lines:
                line = line.strip()
                if line.startswith('##') and ('summary' in line.lower() or 'description' in line.lower()):
                    # Try to get the next non-empty line
                    idx = lines.index(line + '\n')
                    if idx + 1 < len(lines):
                        desc = lines[idx + 1].strip()
                        if desc and not desc.startswith('#'):
                            return desc[:200] + ('...' if len(desc) > 200 else '')
                elif line.startswith('**') and line.endswith('**'):
                    # Bold text might be a description
                    desc = line.strip('*').strip()
                    if len(desc) > 20:
                        return desc[:200] + ('...' if len(desc) > 200 else '')
    except:
        pass
    
    # Fallback descriptions based on filename patterns
    if 'complete' in filename_lower:
        return f"Complete implementation guide for {generate_title(filename).lower()}"
    elif 'fix' in filename_lower:
        return f"Bug fix documentation for {generate_title(filename).lower()}"
    elif 'test' in filename_lower:
        return f"Testing documentation for {generate_title(filename).lower()}"
    elif 'setup' in filename_lower or 'guide' in filename_lower:
        return f"Setup and configuration guide for {generate_title(filename).lower()}"
    else:
        return f"Documentation for {generate_title(filename).lower()}"

def generate_tags(filename, file_path):
    """Generate tags based on filename and content"""
    tags = []
    filename_lower = filename.lower()
    
    # Add tags based on filename patterns
    if 'ase' in filename_lower:
        tags.append('ase-technologies')
    if 'eswari' in filename_lower:
        tags.append('eswari-group')
    if 'customer' in filename_lower:
        tags.append('customers')
    if 'lead' in filename_lower:
        tags.append('leads')
    if 'announcement' in filename_lower:
        tags.append('announcements')
    if 'document' in filename_lower:
        tags.append('documents')
    if 'upload' in filename_lower:
        tags.append('upload')
    if 'company' in filename_lower or 'companies' in filename_lower:
        tags.append('companies')
    if 'brand' in filename_lower:
        tags.append('branding')
    if 'api' in filename_lower:
        tags.append('api')
    if 'backend' in filename_lower:
        tags.append('backend')
    if 'frontend' in filename_lower:
        tags.append('frontend')
    if 'test' in filename_lower:
        tags.append('testing')
    if 'fix' in filename_lower or 'bug' in filename_lower:
        tags.append('bugfixes')
    if 'feature' in filename_lower:
        tags.append('features')
    
    return tags[:8]  # Limit to 8 tags

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f} {size_names[i]}"