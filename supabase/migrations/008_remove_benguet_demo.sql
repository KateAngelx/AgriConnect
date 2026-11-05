-- Remove seed records belonging to the removed Benguet Highland Growers demo seller.
delete from products where seller_id = 'benguet-growers';
delete from sellers where id = 'benguet-growers';
delete from products where seller_id = 'nueva-ecija-rice';
delete from sellers where id = 'nueva-ecija-rice';

delete from notifications where user_id in ('user-jun', 'user-carlo', '9d86bb38-fffe-44db-a56f-76325c96100e', '10d346e6-7be6-434f-bdf0-059719fb3593');
delete from sessions where user_id in ('user-jun', 'user-carlo', '9d86bb38-fffe-44db-a56f-76325c96100e', '10d346e6-7be6-434f-bdf0-059719fb3593');
delete from role_applications where user_id in ('user-jun', 'user-carlo');
delete from profiles where id in ('user-jun', 'user-carlo', '9d86bb38-fffe-44db-a56f-76325c96100e', '10d346e6-7be6-434f-bdf0-059719fb3593');
