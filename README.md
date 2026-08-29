<h1>Simple Social media server</h1>
<p>A simple social media server built with Python and Django. This server allows users to create accounts, post messages, and interact with other users' posts.</p>
***DO NOT USE THIS SERVER IN PRODUCTION***

## Instruction for launching the server

```bash
1.
git clone https://github.com/Clondr/Django10

2.
cd Django10

3.
python3 -m venv venv

4.
For Windows:
venv\Scripts\activate

For Linux:
source venv/bin/activate

6.
pip install -r requirements.txt

7.
python manage.py makemigrations

8.
python manage.py migrate

9.
python manage.py createsuperuser

10.
python manage.py runserver
```