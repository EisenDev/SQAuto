import React from 'react';
import { UploadCloud, Activity, Shield, Play } from 'lucide-react';

interface PipelineFlowProps {
  currentStage: 1 | 2 | 3 | 4; // 1: Upload, 2: Analyze, 3: Validate, 4: Execute
}

export default function PipelineFlow({ currentStage }: PipelineFlowProps) {
  const steps = [
    { num: 1, label: 'Upload', icon: UploadCloud },
    { num: 2, label: 'Analyze', icon: Activity },
    { num: 3, label: 'Validate', icon: Shield },
    { num: 4, label: 'Execute', icon: Play },
  ];

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStage === step.num;
          const isCompleted = currentStage > step.num;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.num}>
              {/* Step indicator */}
              <div className="flex flex-col items-center z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    isActive ? 'bg-indigo-600 border-indigo-100 shadow-[0_0_15px_rgba(79,70,229,0.3)]' :
                    isCompleted ? 'bg-emerald-500 border-emerald-100' : 
                    'bg-gray-100 border-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <span className={`mt-2 text-[10px] font-black uppercase tracking-widest ${
                  isActive ? 'text-indigo-600' :
                  isCompleted ? 'text-emerald-500' :
                  'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 px-2 mb-6">
                  <div className={`h-1 rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
