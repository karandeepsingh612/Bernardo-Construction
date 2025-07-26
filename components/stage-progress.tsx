"use client"

import { type WorkflowStage, WORKFLOW_STAGES, STAGE_LABELS } from "@/types"
import { cn } from "@/lib/utils"
import { Clock, CheckCircle2 } from "lucide-react"

interface StageProgressProps {
  currentStage: WorkflowStage
  completedStages: WorkflowStage[]
}

export function StageProgress({ currentStage, completedStages }: StageProgressProps) {
  const currentIndex = WORKFLOW_STAGES.indexOf(currentStage)

  return (
    <div className="w-full py-6 px-4">
      {/* Background Line - Full Width */}
      <div className="relative">
        <div
          className="absolute top-6 left-6 right-6 h-0.5 bg-gray-300"
          style={{ transform: "translateY(-50%)" }}
        ></div>

        {/* Progress Line - Only for completed stages */}
        {currentIndex > 0 && (
          <div
            className="absolute top-6 left-6 h-0.5 bg-green-500 transition-all duration-500"
            style={{
              width: `calc(${(currentIndex / (WORKFLOW_STAGES.length - 1)) * 100}% - 24px)`,
            }}
          ></div>
        )}

        {/* Stage Items */}
        <div className="flex items-start justify-between relative">
          {WORKFLOW_STAGES.map((stage, index) => {
            const isCompleted = completedStages.includes(stage)
            const isCurrent = stage === currentStage
            const isPending = index > currentIndex

            return (
              <div
                key={stage}
                className="flex flex-col items-center relative"
                style={{ width: `${100 / WORKFLOW_STAGES.length}%` }}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-white",
                    isCompleted && "bg-green-500 border-green-500 text-white shadow-lg",
                    isCurrent && "bg-blue-500 border-blue-500 text-white shadow-lg ring-4 ring-blue-100",
                    isPending && "bg-white border-gray-300 text-gray-400",
                  )}
                  style={{ position: "relative", zIndex: 10 }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <div className="mt-3 text-center w-full px-1">
                  <div
                    className={cn(
                      "text-xs font-medium transition-colors leading-tight",
                      isCompleted && "text-green-600",
                      isCurrent && "text-blue-600",
                      isPending && "text-gray-500",
                    )}
                    style={{
                      wordBreak: "break-word",
                      hyphens: "auto",
                      lineHeight: "1.2",
                    }}
                  >
                    {STAGE_LABELS[stage]}
                  </div>
                  {isCurrent && (
                    <div className="mt-1 inline-block px-1 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Current
                    </div>
                  )}
                  {isCompleted && (
                    <div className="mt-1 inline-block px-1 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Done
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
