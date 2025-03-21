import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { 
  Image as SkiaImage, 
  useImage, 
  Rect, 
  DashPathEffect 
} from '@shopify/react-native-skia';
import { Tools } from '../constants/Tools';

export interface CanvasImage {
  id: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useImagePicker(
  socket: any,
  clientId: string,
  roomId: string | string[],
  isSyncing: boolean,
  setIsSyncing: (value: boolean) => void,
  currentTool: Tools,
  panOffset: { x: number, y: number } 
) {
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CanvasImage | null>(null);

  // Clear selection when tool changes
  useEffect(() => {
    if (currentTool !== Tools.SELECT) {
      setSelectedImage(null);
    }
  }, [currentTool]);

  // Function to pick an image from device
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload images!');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      
      // Create a new canvas image object
      const newImage: CanvasImage = {
        id: `img_${Date.now()}`,
        uri: selectedAsset.uri,
        x: 100 - panOffset.x, // Default position
        y: 100 - panOffset.y, // Default position
        width: selectedAsset.width || 200,
        height: selectedAsset.height || 200
      };

      // Add the image to state
      setImages(prevImages => [...prevImages, newImage]);

      // Emit to socket if not syncing
      if (!isSyncing && socket) {
        socket.emit('canvasImageAdded', {
          roomId,
          image: newImage,
          senderId: clientId,
        });
      }
    }
  };

  // Handle selecting images - now checks if SELECT tool is active and adjusts for pan offset
  const handleImageSelection = (x: number, y: number) => {
    // Only allow selection if using the SELECT tool
    if (currentTool !== Tools.SELECT) {
      return false;
    }
    
    // Adjust coordinates by pan offset
    const adjustedX = x - panOffset.x;
    const adjustedY = y - panOffset.y;
    
    // Check if touch is on an image
    const touchedImage = images.find(img => 
      adjustedX >= img.x && 
      adjustedX <= img.x + img.width && 
      adjustedY >= img.y && 
      adjustedY <= img.y + img.height
    );
    
    if (touchedImage) {
      setSelectedImage(touchedImage);
      return true; // Image was selected
    }
    
    setSelectedImage(null);
    return false; // No image was selected
  };

  // Move selected image - only works if SELECT tool is active
  const moveSelectedImage = (changeX: number, changeY: number) => {
    if (currentTool !== Tools.SELECT || !selectedImage) return false;
    
    setImages(prevImages => 
      prevImages.map(img => 
        img.id === selectedImage.id 
          ? { ...img, x: img.x + changeX, y: img.y + changeY } 
          : img
      )
    );
    
    return true;
  };

  // Reset selection
  const resetImageSelection = () => {
    if (currentTool !== Tools.SELECT) return;
    setSelectedImage(null);
  };

  // socket communication for images
  useEffect(() => {
    if (socket) {
      // Listen for image updates from socket
      socket.on('canvasImageAdded', (data: any) => {
        // skip if this is our own update
        if (data.senderId === clientId) return;

        console.log('Received image data from:', data.senderId);
        
        setIsSyncing(true);
        setImages(prevImages => [...prevImages, data.image]);
        setTimeout(() => setIsSyncing(false), 100);
      });

      socket.on('canvasImagesData', (data: any) => {
        if (data.senderId === clientId) return;
        
        setIsSyncing(true);
        setImages(data.images || []);
        setTimeout(() => setIsSyncing(false), 100);
      });
    }

    return () => {
      if (socket) {
        socket.off('canvasImageAdded');
        socket.off('canvasImagesData');
      }
    };
  }, [socket, clientId]);

  // Emit image data when images change
  useEffect(() => {
    if (isSyncing || !socket) return;

    socket.emit('canvasImagesData', {
      roomId,
      images,
      senderId: clientId,
    });
  }, [images, isSyncing, socket, roomId, clientId]);

  return {
    images,
    selectedImage,
    pickImage,
    handleImageSelection,
    moveSelectedImage,
    resetImageSelection
  };
}

// Component to render an image on the canvas
export function CanvasImageComponent({ 
  image, 
  panOffset, 
  isSelected 
}: { 
  image: CanvasImage, 
  panOffset: { x: number, y: number }, 
  isSelected: boolean 
}) {
  const skiaImage = useImage(image.uri);
  
  if (!skiaImage) return null;
  
  return (
    <>
      <SkiaImage
        image={skiaImage}
        x={image.x + panOffset.x}
        y={image.y + panOffset.y}
        width={image.width}
        height={image.height}
        fit="cover"
      />
      
      {isSelected && (
        <Rect
          x={image.x + panOffset.x - 2}
          y={image.y + panOffset.y - 2}
          width={image.width + 4}
          height={image.height + 4}
          color="rgb(0, 102, 255)"
          style="stroke"
          strokeWidth={2}
        >
          <DashPathEffect intervals={[5, 5]} />
        </Rect>
      )}
    </>
  );
}