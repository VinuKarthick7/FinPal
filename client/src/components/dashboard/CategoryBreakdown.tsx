import React from 'react'

interface CategoryData {
  name: string
  amount: number
  percentage: number
  color: string
}

interface CategoryBreakdownProps {
  categories: CategoryData[]
  total: number
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  total,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Spending by Category</h3>

      {/* Progress Bar */}
      <div className="h-3 sm:h-4 rounded-full bg-gray-100 overflow-hidden flex mb-6">
        {categories.map((category) => (
          <div
            key={category.name}
            style={{
              width: `${category.percentage}%`,
              backgroundColor: category.color,
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      {/* Category List */}
      <div className="space-y-3">
        {categories.map((category) => {
          return (
            <div key={category.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize truncate">
                    {category.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 ml-2">
                    ₹{category.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden mr-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${category.percentage}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {category.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Total Spent</span>
        <span className="text-lg font-bold text-gray-900">
          ₹{total.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  )
}

export default CategoryBreakdown
