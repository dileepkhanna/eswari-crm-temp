from django.core.management.base import BaseCommand
from capital.models import BankInterestRate
from accounts.models import Company


class Command(BaseCommand):
    help = 'Seed bank interest rates for all companies'

    def handle(self, *args, **kwargs):
        companies = Company.objects.all()
        
        if not companies.exists():
            self.stdout.write(self.style.ERROR('No companies found. Please create companies first.'))
            return
        
        bank_rates_data = [
            # SBI Rates
            {
                'bank_name': 'State Bank of India (SBI)',
                'loan_type': 'personal',
                'min_interest_rate': 10.50,
                'max_interest_rate': 15.50,
                'processing_fee_percent': 1.50,
                'min_loan_amount': 25000,
                'max_loan_amount': 2000000,
                'min_tenure_months': 12,
                'max_tenure_months': 72,
                'features': ['No prepayment charges after 6 months', 'Quick approval', 'Flexible EMI'],
            },
            {
                'bank_name': 'State Bank of India (SBI)',
                'loan_type': 'home',
                'min_interest_rate': 8.50,
                'max_interest_rate': 9.65,
                'processing_fee_percent': 0.35,
                'min_loan_amount': 100000,
                'max_loan_amount': 50000000,
                'min_tenure_months': 60,
                'max_tenure_months': 360,
                'features': ['Tax benefits', 'Balance transfer facility', 'Top-up loan available'],
            },
            {
                'bank_name': 'State Bank of India (SBI)',
                'loan_type': 'vehicle',
                'min_interest_rate': 8.70,
                'max_interest_rate': 10.20,
                'processing_fee_percent': 0.25,
                'min_loan_amount': 50000,
                'max_loan_amount': 5000000,
                'min_tenure_months': 12,
                'max_tenure_months': 84,
                'features': ['Up to 90% financing', 'Quick disbursement', 'Flexible repayment'],
            },
            # HDFC Bank Rates
            {
                'bank_name': 'HDFC Bank',
                'loan_type': 'personal',
                'min_interest_rate': 10.75,
                'max_interest_rate': 21.00,
                'processing_fee_percent': 2.50,
                'min_loan_amount': 50000,
                'max_loan_amount': 4000000,
                'min_tenure_months': 12,
                'max_tenure_months': 60,
                'features': ['Instant approval', 'Minimal documentation', 'Doorstep service'],
            },
            {
                'bank_name': 'HDFC Bank',
                'loan_type': 'home',
                'min_interest_rate': 8.60,
                'max_interest_rate': 9.50,
                'processing_fee_percent': 0.50,
                'min_loan_amount': 100000,
                'max_loan_amount': 100000000,
                'min_tenure_months': 60,
                'max_tenure_months': 360,
                'features': ['Pre-approved offers', 'Balance transfer', 'Part payment facility'],
            },
            {
                'bank_name': 'HDFC Bank',
                'loan_type': 'business',
                'min_interest_rate': 11.00,
                'max_interest_rate': 18.00,
                'processing_fee_percent': 2.00,
                'min_loan_amount': 100000,
                'max_loan_amount': 10000000,
                'min_tenure_months': 12,
                'max_tenure_months': 60,
                'features': ['Collateral-free loans', 'Quick processing', 'Flexible tenure'],
            },
            # ICICI Bank Rates
            {
                'bank_name': 'ICICI Bank',
                'loan_type': 'personal',
                'min_interest_rate': 10.85,
                'max_interest_rate': 19.00,
                'processing_fee_percent': 2.00,
                'min_loan_amount': 50000,
                'max_loan_amount': 5000000,
                'min_tenure_months': 12,
                'max_tenure_months': 72,
                'features': ['Instant disbursal', 'Pre-approved loans', 'Flexible EMI options'],
            },
            {
                'bank_name': 'ICICI Bank',
                'loan_type': 'home',
                'min_interest_rate': 8.75,
                'max_interest_rate': 9.80,
                'processing_fee_percent': 0.50,
                'min_loan_amount': 100000,
                'max_loan_amount': 75000000,
                'min_tenure_months': 60,
                'max_tenure_months': 360,
                'features': ['Online application', 'Balance transfer', 'Top-up facility'],
            },
            {
                'bank_name': 'ICICI Bank',
                'loan_type': 'education',
                'min_interest_rate': 9.50,
                'max_interest_rate': 13.50,
                'processing_fee_percent': 1.00,
                'min_loan_amount': 50000,
                'max_loan_amount': 10000000,
                'min_tenure_months': 12,
                'max_tenure_months': 180,
                'features': ['Moratorium period', 'Tax benefits', 'Covers tuition and living expenses'],
            },
            # Axis Bank Rates
            {
                'bank_name': 'Axis Bank',
                'loan_type': 'personal',
                'min_interest_rate': 10.49,
                'max_interest_rate': 22.00,
                'processing_fee_percent': 2.00,
                'min_loan_amount': 50000,
                'max_loan_amount': 4000000,
                'min_tenure_months': 12,
                'max_tenure_months': 60,
                'features': ['Instant approval', 'Minimal documentation', 'Flexible repayment'],
            },
            {
                'bank_name': 'Axis Bank',
                'loan_type': 'vehicle',
                'min_interest_rate': 8.75,
                'max_interest_rate': 11.50,
                'processing_fee_percent': 0.50,
                'min_loan_amount': 50000,
                'max_loan_amount': 10000000,
                'min_tenure_months': 12,
                'max_tenure_months': 84,
                'features': ['Up to 100% financing', 'Quick approval', 'Flexible tenure'],
            },
            {
                'bank_name': 'Axis Bank',
                'loan_type': 'gold',
                'min_interest_rate': 7.50,
                'max_interest_rate': 12.00,
                'processing_fee_percent': 0.50,
                'min_loan_amount': 10000,
                'max_loan_amount': 2000000,
                'min_tenure_months': 3,
                'max_tenure_months': 36,
                'features': ['Instant approval', 'Minimal documentation', 'Flexible repayment'],
            },
            # Kotak Mahindra Bank
            {
                'bank_name': 'Kotak Mahindra Bank',
                'loan_type': 'personal',
                'min_interest_rate': 10.99,
                'max_interest_rate': 24.00,
                'processing_fee_percent': 2.50,
                'min_loan_amount': 50000,
                'max_loan_amount': 2500000,
                'min_tenure_months': 12,
                'max_tenure_months': 60,
                'features': ['Quick disbursal', 'Flexible EMI', 'Pre-approved offers'],
            },
            {
                'bank_name': 'Kotak Mahindra Bank',
                'loan_type': 'business',
                'min_interest_rate': 12.00,
                'max_interest_rate': 20.00,
                'processing_fee_percent': 2.50,
                'min_loan_amount': 100000,
                'max_loan_amount': 7500000,
                'min_tenure_months': 12,
                'max_tenure_months': 48,
                'features': ['Collateral-free', 'Quick approval', 'Flexible repayment'],
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for company in companies:
            for rate_data in bank_rates_data:
                rate, created = BankInterestRate.objects.update_or_create(
                    bank_name=rate_data['bank_name'],
                    loan_type=rate_data['loan_type'],
                    company=company,
                    defaults={
                        'min_interest_rate': rate_data['min_interest_rate'],
                        'max_interest_rate': rate_data['max_interest_rate'],
                        'processing_fee_percent': rate_data['processing_fee_percent'],
                        'min_loan_amount': rate_data['min_loan_amount'],
                        'max_loan_amount': rate_data['max_loan_amount'],
                        'min_tenure_months': rate_data['min_tenure_months'],
                        'max_tenure_months': rate_data['max_tenure_months'],
                        'features': rate_data['features'],
                        'is_active': True,
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Successfully seeded bank rates: {created_count} created, {updated_count} updated'
        ))
