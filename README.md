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

4.
For Linux:
source venv/bin/activate

5.
pip install django Pillow

6.
python manage.py migrate

7.
python manage.py createsuperuser

8.
python manage.py runserver
```