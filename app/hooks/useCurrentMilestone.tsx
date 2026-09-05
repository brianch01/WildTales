import { useState, useEffect } from 'react';

// Extend the NodeJS.Global interface to include currentMilestoneId
declare global {
  namespace NodeJS {
    interface Global {
      currentMilestoneId?: string;
    }
  }
}
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/FirebaseConfig';

interface Milestone {
  id: string;
  name?: string;
  animal_description?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  journey_id?: any;
  visual_asset_url?: string;
  asset_unlock?: string;
  audio_prompt?: string;
  is_complete?: boolean;
  puzzlePieceAssetUrl?: string;
  visited_at?: any | null;
  created_at?: any;
  updated_at?: any;
  puzzle_piece_collected?: boolean;
}

export function useCurrentMilestone() {
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCurrentMilestone = async () => {
      setLoading(true);
      
      try {
        const milestoneId = (global as NodeJS.Global).currentMilestoneId;
        
        if (!milestoneId) {
          setMilestone(null);
          setLoading(false);
          return;
        }
        
        const milestoneRef = doc(db, "milestones", milestoneId);
        const milestoneDoc = await getDoc(milestoneRef);
        
        if (milestoneDoc.exists()) {
          const data = milestoneDoc.data();
          setMilestone({
            id: milestoneDoc.id,
            name: data.name,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            radius: data.radius,
            journey_id: data.journey_id,
            visual_asset_url: data.visual_asset_url,
            asset_unlock: data.asset_unlock,
            audio_prompt: data.audio_prompt,
            is_complete: data.is_complete,
            puzzlePieceAssetUrl: data.puzzlePieceAssetUrl,
            visited_at: data.visited_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
            puzzle_piece_collected: data.puzzle_piece_collected || false,
          });
        } else {
          setError("No milestone found with the current ID");
        }
      } catch (error) {
        console.error("Error fetching current milestone:", error);
        setError("Failed to fetch milestone details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurrentMilestone();
    
    // refresh interval every 10 seconds
    const refreshInterval = setInterval(fetchCurrentMilestone, 10000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  return { milestone, loading, error };
}