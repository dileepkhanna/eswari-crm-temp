import { useCompany } from '@/contexts/CompanyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CompanySelector() {
  const { selectedCompany, availableCompanies, setSelectedCompany, canSelectCompany } = useCompany();
  
  // Don't render if user can't select companies or only has one company
  if (!canSelectCompany || availableCompanies.length <= 1) {
    return null;
  }
  
  return (
    <Select
      value={selectedCompany?.id.toString() || ''}
      onValueChange={(value) => {
        const company = availableCompanies.find(c => c.id.toString() === value);
        if (company) {
          setSelectedCompany(company);
        }
      }}
    >
      <SelectTrigger className="w-[180px] md:w-[200px] h-8 md:h-10 text-sm">
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <>
              {/* Company logo placeholder - will be implemented when logo field is added */}
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {selectedCompany.code.charAt(0)}
              </div>
              <SelectValue placeholder="Select company" />
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableCompanies.map((company) => (
          <SelectItem key={company.id} value={company.id.toString()}>
            <div className="flex items-center gap-2">
              {/* Company logo placeholder - will be implemented when logo field is added */}
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {company.code.charAt(0)}
              </div>
              <span>{company.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
