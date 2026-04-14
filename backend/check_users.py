from accounts.models import User, Company

print('Companies:')
for c in Company.objects.all():
    print(f'  {c.id}: {c.name} ({c.code})')

print('\nUsers by company:')
for u in User.objects.all():
    company_name = u.company.name if u.company else "None"
    print(f'  Company {u.company_id} ({company_name}): {u.email} - {u.first_name} {u.last_name}')

print('\nEmployee count by company:')
for c in Company.objects.all():
    count = User.objects.filter(company=c).count()
    print(f'  {c.name}: {count} employees')
