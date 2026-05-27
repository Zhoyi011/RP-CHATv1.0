// client/src/components/onboarding/OnboardingWizard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingProfile from './OnboardingProfile';
import OnboardingPersona from './OnboardingPersona';
import OnboardingRoom from './OnboardingRoom';
import OnboardingComplete from './OnboardingComplete';

type Step = 'profile' | 'persona' | 'room' | 'complete';

interface OnboardingData {
  username: string;
  displayName: string;
  birthday: string | null;
}

const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('profile');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // 检查是否已完成引导
  useEffect(() => {
    const checkOnboarding = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://rp-chatv1-0.onrender.com/api';
        const res = await fetch(`${API_BASE}/user/onboarding-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        // 如果已完成引导，直接跳转
        if (data.onboarded) {
          navigate('/chat', { replace: true });
        }
      } catch (error) {
        console.error('检查引导状态失败:', error);
      }
    };
    
    checkOnboarding();
  }, [navigate]);

  const handleProfileComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setStep('persona');
  };

  const handlePersonaComplete = () => {
    setStep('room');
  };

  const handleRoomComplete = () => {
    setStep('complete');
  };

  const handleSkipPersona = () => {
    setStep('room');
  };

  // 根据步骤渲染对应组件
  switch (step) {
    case 'profile':
      return <OnboardingProfile onComplete={handleProfileComplete} />;
    case 'persona':
      return <OnboardingPersona onComplete={handlePersonaComplete} onSkip={handleSkipPersona} />;
    case 'room':
      return <OnboardingRoom onComplete={handleRoomComplete} />;
    case 'complete':
      return <OnboardingComplete />;
    default:
      return null;
  }
};

export default OnboardingWizard;